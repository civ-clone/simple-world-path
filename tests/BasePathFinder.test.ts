import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import BasePathFinder from '../BasePathFinder';
import City from '@civ-clone/core-city/City';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Path from '@civ-clone/core-world-path/Path';
import Player from '@civ-clone/core-player/Player';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import TransportRegistry from '@civ-clone/core-unit-transport/TransportRegistry';
import UnitImprovementRegistry from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import { Warrior } from '@civ-clone/civ1-unit/Units';
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
    ...created(unitRegistry),
    ...unitYield(unitImprovementRegistry, ruleRegistry)
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

  it('should correctly avoid enemy tiles and respect adjacency rules', async () => {
    const world = await simpleWorldLoader('7O5GO5GO5GO5GO5G', 6, 6),
      player = new Player(ruleRegistry),
      enemy = new Player(ruleRegistry),
      startTile = world.get(1, 1),
      targetTile = world.get(4, 4),
      unit = new Warrior(null, player, startTile, ruleRegistry),
      enemyUnit = new Warrior(null, enemy, world.get(3, 3), ruleRegistry),
      city = new City(enemy, world.get(3, 3), '', ruleRegistry);

    unitRegistry.register(unit, enemyUnit);
    cityRegistry.register(city);

    const pathFinder = new BasePathFinder(unit, startTile, targetTile),
      path = pathFinder.generate();

    expect(path instanceof Path).to.true;
    expect(path.length).to.equal(6);

    unitRegistry.unregister(unit, enemyUnit);
    cityRegistry.unregister(city);
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

  it('should prefer routes with a lower movement cost', async () => {
    const world = await simpleWorldLoader(
        '9O6G2OM5OGOM5OGOM5OGOM5OGOM5OG2OM4GO',
        8,
        8
      ),
      player = new Player(ruleRegistry),
      startTile = world.get(1, 1),
      targetTile = world.get(2, 7),
      unit = new Warrior(null, player, startTile, ruleRegistry);

    const pathFinder = new BasePathFinder(unit, startTile, targetTile),
      path = pathFinder.generate();

    expect(path instanceof Path).to.true;
    expect([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 2],
      [7, 3],
      [7, 4],
      [7, 5],
      [7, 6],
      [6, 7],
      [5, 7],
      [4, 7],
      [3, 7],
      [2, 7],
    ]).to.deep.equal(path.map((tile) => [tile.x(), tile.y()]));
  });
});
