"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePathFinder = void 0;
const Types_1 = require("@civ-clone/library-unit/Types");
const PathFinder_1 = require("@civ-clone/core-world-path/PathFinder");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const Actions_1 = require("@civ-clone/library-unit/Actions");
const MovementCost_1 = require("@civ-clone/core-unit/Rules/MovementCost");
const Path_1 = require("@civ-clone/core-world-path/Path");
/**
 * Cheaper first, then fewer steps: a railroad costs nothing, so without the
 * second key every route along one would tie and any of them could come out.
 */
const isBefore = (a, b) => a.totalCost < b.totalCost ||
    (a.totalCost === b.totalCost && a.steps < b.steps);
/** A binary min-heap of nodes, ordered by `isBefore`. */
class OpenSet {
    constructor() {
        this._nodes = [];
    }
    get length() {
        return this._nodes.length;
    }
    pop() {
        const nodes = this._nodes, top = nodes[0], last = nodes.pop();
        if (nodes.length) {
            nodes[0] = last;
            let index = 0;
            for (;;) {
                const left = index * 2 + 1, right = left + 1;
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
    push(node) {
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
class BasePathFinder extends PathFinder_1.PathFinder {
    constructor(unit, start, end, ruleRegistry = RuleRegistry_1.instance) {
        super(unit, start, end);
        this._ruleRegistry = ruleRegistry;
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
        var _a;
        return {
            tile,
            parent,
            cost,
            totalCost: ((_a = parent === null || parent === void 0 ? void 0 : parent.totalCost) !== null && _a !== void 0 ? _a : 0) + cost,
            steps: parent === null ? 0 : parent.steps + 1,
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
    /**
     * What stepping from `from` to `to` costs, as the `MovementCost` rules say,
     * but never more than `movement` (a whole turn's moves): a unit short of the
     * moves a tile needs spends the rest of its turn entering it anyway, so to a
     * Warrior hills take a turn, just as grassland does.
     */
    stepCost(from, to, movement) {
        const [cost] = this._ruleRegistry
            .process(MovementCost_1.default, this.unit(), new Actions_1.Move(from, to, this.unit(), this._ruleRegistry))
            .sort((costA, costB) => costA - costB);
        if (cost === undefined) {
            return 1;
        }
        return movement > 0 && cost > movement ? movement : cost;
    }
    /**
     * The cheapest route by movement cost (uniform-cost search), taking the
     * fewest steps among routes that cost the same, or `undefined` if there is
     * none. There is no distance heuristic: a railroad costs nothing, so no
     * distance can be said to cost at least anything.
     */
    generate() {
        const end = this.end(), movement = this.unit().movement().value(), open = new OpenSet(), best = new Map(), done = new Set(), startNode = this.createNode(this.start());
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
            current.tile.getNeighbours().forEach((target) => {
                if (done.has(target) || !this.canMoveTo(target)) {
                    return;
                }
                const candidate = this.createNode(target, current, this.stepCost(current.tile, target, movement)), known = best.get(target);
                if (known === undefined || isBefore(candidate, known)) {
                    best.set(target, candidate);
                    open.push(candidate);
                }
            });
        }
        return undefined;
    }
}
exports.BasePathFinder = BasePathFinder;
exports.default = BasePathFinder;
//# sourceMappingURL=BasePathFinder.js.map