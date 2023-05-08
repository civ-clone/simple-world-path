import BasePathFinder from './BasePathFinder';
import { instance as pathFinderRegistryInstance } from '@civ-clone/core-world-path/PathFinderRegistry';

pathFinderRegistryInstance.register(BasePathFinder);
