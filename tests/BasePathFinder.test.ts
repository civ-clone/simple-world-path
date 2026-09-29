import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import BasePathFinder from '../BasePathFinder';
import City from '@civ-clone/core-city/City';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import ExpectedMovementCost from '@civ-clone/core-world-path/Rules/ExpectedMovementCost';
import Path from '@civ-clone/core-world-path/Path';
import Player from '@civ-clone/core-player/Player';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import TransportRegistry from '@civ-clone/core-unit-transport/TransportRegistry';
import UnitImprovementRegistry from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import { Railroad, Road } from '@civ-clone/library-world/TileImprovements';
import { Tank, Warrior } from '@civ-clone/library-unit/Units';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import World from '@civ-clone/core-world/World';
import action from '@civ-clone/civ1-unit/Rules/Unit/action';
import created from '@civ-clone/civ1-unit/Rules/Unit/created';
import { expect } from 'chai';
import moved from '@civ-clone/civ1-unit/Rules/Unit/moved';
import movementCost from '@civ-clone/civ1-unit/Rules/Unit/movementCost';
import simpleRLELoader from '@civ-clone/simple-world-generator/tests/lib/simpleRLELoader';
import unitYield from '@civ-clone/civ1-unit/Rules/Unit/yield';
import validateMove from '@civ-clone/civ1-unit/Rules/Unit/validateMove';

describe('BasePathFinder', () => {
  const ruleRegistry = new RuleRegistry(),
    cityRegistry = new CityRegistry(),
    unitRegistry = new UnitRegistry(),
    tileImprovementRegistry = new TileImprovementRegistry(),
    transportRegistry = new TransportRegistry(),
    unitImprovementRegistry = new UnitImprovementRegistry(),
    simpleWorldLoader = simpleRLELoader(ruleRegistry);

  ruleRegistry.register(
    ...movementCost(tileImprovementRegistry, transportRegistry),
    ...action(
      undefined,
      cityRegistry,
      ruleRegistry,
      tileImprovementRegistry,
      undefined,
      unitRegistry
    ),
    ...unitYield(unitImprovementRegistry, ruleRegistry),
    ...moved(transportRegistry, ruleRegistry),
    ...validateMove(),
    ...created(unitRegistry)
  );

  it('should return the shortest path length for neighbouring tiles', async () => {
    const world = await simpleWorldLoader('100Gd', 10, 10),
      player = new Player(ruleRegistry),
      startTile = world.get(3, 3),
      targetTile = world.get(4, 4),
      unit = new Warrior(null, player, startTile, ruleRegistry);

    const pathFinder = new BasePathFinder(unit, startTile, targetTile),
      path = pathFinder.generate();

    expect(path instanceof Path).to.true;
    expect(path.length).to.equal(2);
  });

  it('should find a valid path avoiding water', async () => {
    const world = await simpleWorldLoader(
        '11O8G10OG2O5G2OGOG5OGOGOG2OG2OGOGOGOGOGOGOGOGOG3OGOGOG2O3G2OGOG7OG2O7GO',
        11,
        10
      ),
      player = new Player(ruleRegistry),
      startTile = world.get(1, 1),
      targetTile = world.get(5, 6),
      unit = new Warrior(null, player, startTile, ruleRegistry);

    const pathFinder = new BasePathFinder(unit, startTile, targetTile),
      path = pathFinder.generate();

    expect(path instanceof Path).to.true;
    expect(path.length).to.equal(45);
  });

  it('should correctly yield no path when applicable', async () => {
    const world = await simpleWorldLoader('5OG9OG', 4, 4),
      player = new Player(ruleRegistry),
      startTile = world.get(1, 1),
      targetTile = world.get(3, 3),
      unit = new Warrior(null, player, startTile, ruleRegistry);

    const pathFinder = new BasePathFinder(unit, startTile, targetTile),
      path = pathFinder.generate();

    expect(path).to.undefined;
  });

  // Two routes from (1, 1) to (7, 1), with ocean around and between them:
  //
  //   OOOOOOOOO
  //   OG?????GO   the direct route: six steps across `row1`
  //   OGOOOOOGO
  //   OGGGGGGGO   the detour: eight steps, (1, 2) and (7, 2) join it on
  //   OOOOOOOOO
  const twoRoutes = (row1: string): Promise<World> =>
      simpleWorldLoader(`10OG${row1}G2OG5OG2O7G10O`, 5, 9),
    detour: [number, number][] = [
      [1, 1],
      [1, 2],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [7, 2],
      [7, 1],
    ],
    direct: [number, number][] = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
    ],
    build = (
      world: World,
      Improvement: typeof Road | typeof Railroad,
      coordinates: [number, number][]
    ): void =>
      coordinates.forEach(([x, y]) =>
        tileImprovementRegistry.register(
          new Improvement(world.get(x, y), ruleRegistry)
        )
      ),
    route = (
      world: World,
      UnitType: typeof Warrior | typeof Tank = Warrior
    ): Path => {
      const player = new Player(ruleRegistry),
        start = world.get(1, 1),
        unit = new UnitType(null, player, start, ruleRegistry);

      return new BasePathFinder(
        unit,
        start,
        world.get(7, 1),
        ruleRegistry
      ).generate();
    },
    coordinatesOf = (path: Path): [number, number][] =>
      path.map((tile: Tile): [number, number] => [tile.x(), tile.y()]);

  it('should take a longer road over a shorter route across mountains', async () => {
    const world = await twoRoutes('5M');

    build(world, Road, detour);

    const path = route(world, Tank);

    expect(coordinatesOf(path)).to.deep.equal(detour);
    expect(path.movementCost()).to.be.closeTo(8 / 3, 1e-9);
  });

  it('should take a longer railroad over a shorter road', async () => {
    const world = await twoRoutes('5G');

    build(world, Road, direct);
    build(world, Railroad, detour);

    const path = route(world, Tank);

    expect(coordinatesOf(path)).to.deep.equal(detour);
    expect(path.movementCost()).to.equal(0);
  });

  it('should take the fewest steps when routes cost the same', async () => {
    const world = await twoRoutes('5G');

    build(world, Railroad, [...direct, ...detour]);

    expect(coordinatesOf(route(world, Tank))).to.deep.equal(direct);
  });

  it('should cross hills directly with a unit that has one move per turn', async () => {
    // Entering hills takes a one-move unit's whole turn, just as grassland does.
    const world = await twoRoutes('5H'),
      path = route(world, Warrior);

    expect(coordinatesOf(path)).to.deep.equal(direct);
    expect(path.movementCost()).to.equal(6);
  });

  it('should go around hills with a unit that has three moves per turn', async () => {
    const world = await twoRoutes('5H'),
      path = route(world, Tank);

    expect(coordinatesOf(path)).to.deep.equal(detour);
    expect(path.movementCost()).to.equal(8);
  });
  it('should ask what a step the unit cannot afford is worth, and route by the answer', async () => {
    // Priced as civ1-unit does: a Warrior gets into mountains 2 times in 3, so
    // each is worth 1.5, and five of them cost more than the eight-step detour.
    const asked: [number, number][] = [],
      rule = new ExpectedMovementCost(
        new Criterion((): boolean => true),
        new Effect(
          (unit: Unit, movementCost: number, movement: number): number => {
            asked.push([movementCost, movement]);

            return Math.max(movement, movementCost * 0.5);
          }
        )
      );

    ruleRegistry.register(rule);

    try {
      const world = await twoRoutes('5M'),
        path = route(world, Warrior);

      expect(coordinatesOf(path)).to.deep.equal(detour);
      expect(path.movementCost()).to.equal(8);
      // Only for the mountains: grassland is within a Warrior's turn.
      expect(asked.length).to.be.greaterThan(0);
      asked.forEach((call) => expect(call).to.deep.equal([3, 1]));
    } finally {
      ruleRegistry.unregister(rule);
    }
  });

  it('should count a step the unit cannot afford as one turn when no rule prices it', async () => {
    const world = await twoRoutes('5M'),
      path = route(world, Warrior);

    expect(coordinatesOf(path)).to.deep.equal(direct);
    expect(path.movementCost()).to.equal(6);
  });
});
