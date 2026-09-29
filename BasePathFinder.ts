import { Air, Land as LandUnit, Naval } from '@civ-clone/library-unit/Types';
import { PathFinder, IPathFinder } from '@civ-clone/core-world-path/PathFinder';
import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import Action from '@civ-clone/core-unit/Action';
import { Move } from '@civ-clone/library-unit/Actions';
import ExpectedMovementCost from '@civ-clone/core-world-path/Rules/ExpectedMovementCost';
import MovementCost from '@civ-clone/core-unit/Rules/MovementCost';
import Path from '@civ-clone/core-world-path/Path';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

export type Node = {
  tile: Tile;
  parent: Node | null;
  cost: number;
  // Totals from the start, so the open set can be ordered without walking
  // `parent` back each time. `costKey` is `totalCost` as `toCostKey` rounds it.
  totalCost: number;
  costKey: number;
  steps: number;
};

interface IBasePathFinder extends IPathFinder {
  createNode(tile: Tile, parent: Node | null, cost: number): Node;
  createPath(node: Node): Path;
}

/**
 * A total cost as a whole number of millionths, which is what routes are
 * compared by. A road step costs 1/3, and six of them sum to
 * 1.9999999999999998 in floating point, which would otherwise beat two steps
 * costing 1 each for no reason but rounding. Rounding to an integer key, rather
 * than comparing with a tolerance, keeps the ordering transitive, which the
 * heap relies on.
 */
const toCostKey = (totalCost: number): number => Math.round(totalCost * 1e6);

/**
 * Cheaper first, then fewer steps: a railroad costs nothing, so without the
 * second key every route along one would tie and any of them could come out.
 */
const isBefore = (a: Node, b: Node): boolean =>
  a.costKey < b.costKey || (a.costKey === b.costKey && a.steps < b.steps);

/** A binary min-heap of nodes, ordered by `isBefore`. */
class OpenSet {
  private _nodes: Node[] = [];

  get length(): number {
    return this._nodes.length;
  }

  pop(): Node {
    const nodes = this._nodes,
      top = nodes[0],
      last = nodes.pop() as Node;

    if (nodes.length) {
      nodes[0] = last;

      let index = 0;

      for (;;) {
        const left = index * 2 + 1,
          right = left + 1;

        let smallest = index;

        if (left < nodes.length && isBefore(nodes[left], nodes[smallest])) {
          smallest = left;
        }

        if (right < nodes.length && isBefore(nodes[right], nodes[smallest])) {
          smallest = right;
        }

        if (smallest === index) {
          break;
        }

        [nodes[index], nodes[smallest]] = [nodes[smallest], nodes[index]];
        index = smallest;
      }
    }

    return top;
  }

  push(node: Node): void {
    const nodes = this._nodes;

    nodes.push(node);

    let index = nodes.length - 1;

    while (index > 0) {
      const parent = (index - 1) >> 1;

      if (!isBefore(nodes[index], nodes[parent])) {
        break;
      }

      [nodes[index], nodes[parent]] = [nodes[parent], nodes[index]];
      index = parent;
    }
  }
}

export class BasePathFinder extends PathFinder implements IBasePathFinder {
  private _ruleRegistry: RuleRegistry;

  constructor(
    unit: Unit,
    start: Tile,
    end: Tile,
    ruleRegistry: RuleRegistry = ruleRegistryInstance
  ) {
    super(unit, start, end);

    this._ruleRegistry = ruleRegistry;
  }

  private canMoveTo(tile: Tile): boolean {
    if (this.unit() instanceof Air) {
      return true;
    }

    if (this.unit() instanceof LandUnit) {
      return tile.isLand();
    }

    if (this.unit() instanceof Naval) {
      return tile.isWater();
    }

    return false;
  }

  createNode(tile: Tile, parent: Node | null = null, cost: number = 0): Node {
    const totalCost = (parent?.totalCost ?? 0) + cost;

    return {
      tile,
      parent,
      cost,
      totalCost,
      costKey: toCostKey(totalCost),
      steps: parent === null ? 0 : parent.steps + 1,
    };
  }

  createPath(node: Node): Path {
    const tiles: Tile[] = [];

    let movementCost = 0;

    while (node.parent) {
      tiles.unshift(node.tile);
      movementCost += node.cost;

      node = node.parent;
    }

    tiles.unshift(node.tile);

    const path = new Path(...tiles);

    path.setMovementCost(movementCost);

    return path;
  }

  /**
   * What stepping from `from` to `to` is worth to a route. That's what the
   * `MovementCost` rules say, unless it's more than `movement` (a whole turn's
   * moves). Then entering the tile can take more than one attempt, and the
   * `ExpectedMovementCost` rules say what it's worth on average. With no such
   * rule it costs a turn, because a unit short of the moves spends the rest of
   * its turn trying.
   */
  private stepCost(from: Tile, to: Tile, movement: number): number {
    const [cost] = this._ruleRegistry
      .process(
        MovementCost,
        this.unit(),
        new Move(from, to, this.unit(), this._ruleRegistry) as Action
      )
      .sort((costA: number, costB: number): number => costA - costB);

    if (cost === undefined) {
      return 1;
    }

    if (movement <= 0 || cost <= movement) {
      return cost;
    }

    const [expected] = this._ruleRegistry.process(
      ExpectedMovementCost,
      this.unit(),
      cost,
      movement
    );

    return expected ?? movement;
  }

  /**
   * The cheapest route by movement cost (uniform-cost search), taking the
   * fewest steps among routes that cost the same, or `undefined` if there is
   * none. There is no distance heuristic: a railroad costs nothing, so no
   * distance can be said to cost at least anything.
   */
  generate(): Path {
    const end = this.end(),
      movement = this.unit().movement().value(),
      open = new OpenSet(),
      best = new Map<Tile, Node>(),
      done = new Set<Tile>(),
      startNode = this.createNode(this.start());

    open.push(startNode);
    best.set(startNode.tile, startNode);

    while (open.length) {
      const current = open.pop();

      // A tile can be queued again when a cheaper way to it is found; only the
      // first of its entries to come out counts.
      if (done.has(current.tile)) {
        continue;
      }

      if (current.tile === end) {
        return this.createPath(current);
      }

      done.add(current.tile);

      current.tile.getNeighbours().forEach((target: Tile): void => {
        if (done.has(target) || !this.canMoveTo(target)) {
          return;
        }

        const candidate = this.createNode(
            target,
            current,
            this.stepCost(current.tile, target, movement)
          ),
          known = best.get(target);

        if (known === undefined || isBefore(candidate, known)) {
          best.set(target, candidate);
          open.push(candidate);
        }
      });
    }

    return undefined as unknown as Path;
  }
}

export default BasePathFinder;
