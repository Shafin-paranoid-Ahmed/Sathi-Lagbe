import { StaticMapsPath } from './types';
/**
 * Assembles path parameters for the Static Maps API from an array of paths.
 *
 * This function constructs a string of path parameters for each path. Each path parameter string
 * includes the style properties and the coordinates of the paths.
 *
 * @param {Array<StaticMapsPath>} [paths=[]] - An array of paths to be assembled into path parameters.
 * @returns {Array<string>} An array of path parameter strings.
 *
 * @example
 * ```typescript
 * const paths = [
 *   {
 *     color: 'red',
 *     weight: 5,
 *     coordinates: [
 *       { lat: 40.714728, lng: -73.998672 },
 *       { lat: 40.718217, lng: -73.998284 }
 *     ]
 *   }
 * ];
 *
 * const pathParams = assemblePathParams(paths);
 * // Output: ['color:red|weight:5|40.714728,-73.998672|40.718217,-73.998284']
 * ```
 */
export declare function assemblePathParams(paths?: Array<StaticMapsPath>): string[];
