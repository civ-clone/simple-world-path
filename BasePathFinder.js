"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _candidates, _heap, _ruleRegistry, _seen;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePathFinder = void 0;
const Types_1 = require("@civ-clone/library-unit/Types");
const PathFinder_1 = require("@civ-clone/core-world-path/PathFinder");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const Actions_1 = require("@civ-clone/library-unit/Actions");
const MovementCost_1 = require("@civ-clone/core-unit/Rules/MovementCost");
const Path_1 = require("@civ-clone/core-world-path/Path");
class BasePathFinder extends PathFinder_1.PathFinder {
    constructor(unit, start, end, ruleRegistry = RuleRegistry_1.instance) {
        super(unit, start, end);
        _candidates.set(this, []);
        _heap.set(this, [this.createNode(this.start())]);
        _ruleRegistry.set(this, void 0);
        _seen.set(this, [this.start()]);
        __classPrivateFieldSet(this, _ruleRegistry, ruleRegistry);
    }
    canMoveTo(tile) {
        if (this.unit() instanceof Types_1.Air) {
            return true;
        }
        if (this.unit() instanceof Types_1.Land) {
            return tile.isLand();
        }
        if (this.unit() instanceof Types_1.Naval) {
            return tile.isWater();
        }
        return false;
    }
    createNode(tile, parent = null, cost = 0) {
        return {
            tile,
            parent,
            cost,
        };
    }
    createPath(node) {
        const tiles = [];
        let movementCost = 0;
        while (node.parent) {
            tiles.unshift(node.tile);
            movementCost += node.cost;
            node = node.parent;
        }
        tiles.unshift(node.tile);
        const path = new Path_1.default(...tiles);
        path.setMovementCost(movementCost);
        return path;
    }
    generate() {
        while (__classPrivateFieldGet(this, _heap).length) {
            const currentNode = __classPrivateFieldGet(this, _heap).shift(), { tile } = currentNode;
            tile
                .getNeighbours()
                .sort((neighbourA, neighbourB) => neighbourA.distanceFrom(tile) - neighbourB.distanceFrom(tile))
                // TODO: is this needed to make it fair?
                // .filter((tile: Tile): boolean => this.#playerWorldRegistry.getByPlayer(this.unit().player()).includes(tile))
                .forEach((target) => {
                if (this.canMoveTo(target)) {
                    const [movementCost] = __classPrivateFieldGet(this, _ruleRegistry).process(MovementCost_1.default, this.unit(), new Actions_1.Move(tile, target, this.unit(), __classPrivateFieldGet(this, _ruleRegistry)))
                        .sort((costA, costB) => costA - costB), targetNode = this.createNode(target, currentNode, 1);
                    if (target === this.end()) {
                        __classPrivateFieldGet(this, _candidates).push(this.createPath(targetNode));
                        // if this path is "good enough" (<10% longer than direct), skip out here...
                        if (__classPrivateFieldGet(this, _candidates)[__classPrivateFieldGet(this, _candidates).length - 1].length <
                            this.start().distanceFrom(this.end()) * 1.1) {
                            __classPrivateFieldGet(this, _heap).splice(0, __classPrivateFieldGet(this, _heap).length);
                        }
                        return;
                    }
                    if (!__classPrivateFieldGet(this, _heap).some((node) => node.tile === target) &&
                        !__classPrivateFieldGet(this, _seen).includes(target)) {
                        __classPrivateFieldGet(this, _heap).push(targetNode);
                        __classPrivateFieldGet(this, _seen).push(target);
                    }
                }
            });
        }
        // TODO: This might get REALLY expensive...
        const [cheapest] = __classPrivateFieldGet(this, _candidates).sort((a, b) => a.movementCost() - b.movementCost());
        return cheapest;
    }
}
exports.BasePathFinder = BasePathFinder;
_candidates = new WeakMap(), _heap = new WeakMap(), _ruleRegistry = new WeakMap(), _seen = new WeakMap();
exports.default = BasePathFinder;
//# sourceMappingURL=BasePathFinder.js.map