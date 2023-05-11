import { PathFinder, IPathFinder } from '@civ-clone/core-world-path/PathFinder';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import Path from '@civ-clone/core-world-path/Path';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export declare type Node = {
  tile: Tile;
  parent: Node | null;
  cost: number;
};
interface IBasePathFinder extends IPathFinder {
  createNode(tile: Tile, parent: Node | null, cost: number): Node;
  createPath(node: Node): Path;
}
export declare class BasePathFinder
  extends PathFinder
  implements IBasePathFinder {
  #private;
  constructor(unit: Unit, start: Tile, end: Tile, ruleRegistry?: RuleRegistry);
  private canMoveTo;
  createNode(tile: Tile, parent?: Node | null, cost?: number): Node;
  createPath(node: Node): Path;
  generate(): Path;
}
export default BasePathFinder;
