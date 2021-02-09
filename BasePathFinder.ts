import { PathFinder, IPathFinder } from '@civ-clone/core-world-path/PathFinder';
import Action from '@civ-clone/core-unit/Action';
import { Move } from '@civ-clone/civ1-unit/Actions';
import Path from '@civ-clone/core-world-path/Path';
import Tile from '@civ-clone/core-world/Tile';

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
  #candidates: Path[] = [];
  #heap: Node[] = [this.createNode(this.start())];
  #seen: Tile[] = [this.start()];

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
    while (this.#heap.length) {
      const currentNode = this.#heap.shift(),
        { tile } = currentNode as Node;

      tile
        .getNeighbours()
        // TODO: is this needed to make it fair?
        // .filter((tile: Tile): boolean => this.unit().player().hasSeen(tile))
        .forEach((target: Tile): void => {
          const [move] = this.unit()
            .actions(target, tile)
            .filter(
              (action: Action): boolean => action instanceof Move
            ) as Move[];

          if (move) {
            const targetNode = this.createNode(
              target,
              currentNode,
              move.movementCost()
            );

            if (target === this.end()) {
              this.#candidates.push(this.createPath(targetNode));

              return;
            }

            if (
              !this.#heap.some((node: Node): boolean => node.tile === target) &&
              !this.#seen.includes(target)
            ) {
              this.#heap.push(targetNode);
              this.#seen.push(target);
            }
          }
        });
    }

    // TODO: This might get REALLY expensive...
    const [cheapest] = this.#candidates.sort(
      (a: Path, b: Path): number => a.movementCost() - b.movementCost()
    );

    return cheapest;
  }
}

export default BasePathFinder;
