"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _candidates, _heap, _seen;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePathFinder = void 0;
const PathFinder_1 = require("@civ-clone/core-world-path/PathFinder");
const Actions_1 = require("@civ-clone/civ1-unit/Actions");
const Path_1 = require("@civ-clone/core-world-path/Path");
class BasePathFinder extends PathFinder_1.PathFinder {
    constructor() {
        super(...arguments);
        _candidates.set(this, []);
        _heap.set(this, [this.createNode(this.start())]);
        _seen.set(this, [this.start()]);
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
                // TODO: is this needed to make it fair?
                // .filter((tile: Tile): boolean => this.unit().player().hasSeen(tile))
                .forEach((target) => {
                const [move] = this.unit()
                    .actions(target, tile)
                    .filter((action) => action instanceof Actions_1.Move);
                if (move) {
                    const targetNode = this.createNode(target, currentNode, move.movementCost());
                    if (target === this.end()) {
                        __classPrivateFieldGet(this, _candidates).push(this.createPath(targetNode));
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
_candidates = new WeakMap(), _heap = new WeakMap(), _seen = new WeakMap();
exports.default = BasePathFinder;
//# sourceMappingURL=BasePathFinder.js.map