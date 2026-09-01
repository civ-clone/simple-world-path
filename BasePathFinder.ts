import { Air, Land as LandUnit, Naval } from '@civ-clone/library-unit/Types';
import { PathFinder, IPathFinder } from '@civ-clone/core-world-path/PathFinder';
import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import Action from '@civ-clone/core-unit/Action';
import { Move } from '@civ-clone/library-unit/Actions';
import MovementCost from '@civ-clone/core-unit/Rules/MovementCost';
import Path from '@civ-clone/core-world-path/Path';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

export type Node = {
  tile: Tile;
  parent: Node | null;
  cost: number;
};

interface IBasePathFinder extends IPathFinder {
  createNode(tile: Tile, parent: Node | null, cost: number): Node;
  createPath(node: Node): Path;
}

export class BasePathFinder extends PathFinder implements IBasePathFinder {
  private _candidates: Path[] = [];
  private _heap: Node[] = [this.createNode(this.start())];
  private _ruleRegistry: RuleRegistry;
  private _seen: Tile[] = [this.start()];

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
    return {
      tile,
      parent,
      cost,
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

  generate(): Path {
    while (this._heap.length) {
      const currentNode = this._heap.shift(),
        { tile } = currentNode as Node;

      tile
        .getNeighbours()
        .sort(
          (neighbourA, neighbourB) =>
            neighbourA.distanceFrom(tile) - neighbourB.distanceFrom(tile)
        )
        // TODO: is this needed to make it fair?
        // .filter((tile: Tile): boolean => this.#playerWorldRegistry.getByPlayer(this.unit().player()).includes(tile))
        .forEach((target: Tile): void => {
          if (this.canMoveTo(target)) {
            const [movementCost] = this._ruleRegistry
                .process(
                  MovementCost,
                  this.unit(),
                  new Move(
                    tile,
                    target,
                    this.unit(),
                    this._ruleRegistry
                  ) as Action
                )
                .sort((costA, costB) => costA - costB),
              targetNode = this.createNode(target, currentNode, 1);

            if (target === this.end()) {
              this._candidates.push(this.createPath(targetNode));

              // if this path is "good enough" (<10% longer than direct), skip out here...
              if (
                this._candidates[this._candidates.length - 1].length <
                this.start().distanceFrom(this.end()) * 1.1
              ) {
                this._heap.splice(0, this._heap.length);
              }

              return;
            }

            if (
              !this._heap.some((node: Node): boolean => node.tile === target) &&
              !this._seen.includes(target)
            ) {
              this._heap.push(targetNode);
              this._seen.push(target);
            }
          }
        });
    }

    // TODO: This might get REALLY expensive...
    const [cheapest] = this._candidates.sort(
      (a: Path, b: Path): number => a.movementCost() - b.movementCost()
    );

    return cheapest;
  }
}

export default BasePathFinder;
