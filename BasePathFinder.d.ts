import { PathFinder, IPathFinder } from '@civ-clone/core-world-path/PathFinder';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import Path from '@civ-clone/core-world-path/Path';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export type Node = {
  tile: Tile;
  parent: Node | null;
  cost: number;
  totalCost: number;
  steps: number;
};
interface IBasePathFinder extends IPathFinder {
  createNode(tile: Tile, parent: Node | null, cost: number): Node;
  createPath(node: Node): Path;
}
export declare class BasePathFinder
  extends PathFinder
  implements IBasePathFinder
{
  private _ruleRegistry;
  constructor(unit: Unit, start: Tile, end: Tile, ruleRegistry?: RuleRegistry);
  private canMoveTo;
  createNode(tile: Tile, parent?: Node | null, cost?: number): Node;
  createPath(node: Node): Path;
  /**
   * What stepping from `from` to `to` is worth to a route. That's what the
   * `MovementCost` rules say, unless it's more than `movement` (a whole turn's
   * moves). Then entering the tile can take more than one attempt, and the
   * `ExpectedMovementCost` rules say what it's worth on average. With no such
   * rule it costs a turn, because a unit short of the moves spends the rest of
   * its turn trying.
   */
  private stepCost;
  /**
   * The cheapest route by movement cost (uniform-cost search), taking the
   * fewest steps among routes that cost the same, or `undefined` if there is
   * none. There is no distance heuristic: a railroad costs nothing, so no
   * distance can be said to cost at least anything.
   */
  generate(): Path;
}
export default BasePathFinder;
