import { CityRegistry } from '@civ-clone/core-city/CityRegistry';
import { PathFinder, IPathFinder } from '@civ-clone/core-world-path/PathFinder';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import { UnitRegistry } from '@civ-clone/core-unit/UnitRegistry';
import Path from '@civ-clone/core-world-path/Path';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export type Node = {
  tile: Tile;
  parent: Node | null;
  cost: number;
  totalCost: number;
  costKey: number;
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
  private _cityRegistry;
  private _ruleRegistry;
  private _unitRegistry;
  constructor(
    unit: Unit,
    start: Tile,
    end: Tile,
    ruleRegistry?: RuleRegistry,
    cityRegistry?: CityRegistry,
    unitRegistry?: UnitRegistry
  );
  /**
   * Whether another player's unit or city is on `tile`. A route can't pass
   * through one: there is no `Move` onto it, so a journey along the route
   * would stop there (an aircraft sent home past a rival city stopped short and
   * ran out of fuel, civ-clone/web-renderer#357). The destination is exempt,
   * so a route can still lead to something to attack, trade with or visit.
   */
  private isHeldByAnotherPlayer;
  /**
   * Whether an `Impassable` rule says a route can't pass through `tile` from
   * `from`. Like a tile held by another player, the destination is exempt.
   */
  private isImpassable;
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
   *
   * A search asks this once for each step it considers: a tile's neighbours
   * are costed when the tile is expanded, and each tile is expanded once, so
   * caching step costs within a search would save nothing
   * (civ-clone/web-renderer#307).
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
