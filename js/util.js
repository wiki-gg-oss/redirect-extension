/** @type {( SiteListEntity | SiteListEntity[] )[]} */
import sites from '../sites.json';
import defaultSettingsFactory from '../defaults.js';


let _isDevBuild = null;


/**
 * Checks if the extension wasn't packaged for store.
 *
 * @return {boolean}
 */
export function isDevelopmentBuild() {
    if ( _isDevBuild === null ) {
        _isDevBuild = chrome.runtime.getManifest().name.includes( 'DEVBUILD' );
    }
    return _isDevBuild;
}


/**
 * Returns localised message or key as fallback.
 *
 * @param {string} key
 * @param {...any} params
 * @return {string}
 */
export function getMessage( key, ...params ) {
    const msg = chrome.i18n.getMessage( key, ...params );
    return msg || key;
}


/**
 * Checks if declarative network requests are supported by the browser.
 *
 * @return {boolean}
 */
export function supportsDNR() {
    return false; // navigator.userAgent.indexOf( 'Chrome' ) < 0;
}


// TODO: ditch uiClass, have spacers contain entries instead so popup is able to render the list sanely.


/**
 * @typedef {Object} SiteRecord
 * Record of an individual wiki.
 * @property {string} id wiki.gg domain name.
 * @property {string} [oldId] Fandom domain name, if different from wiki.gg.
 * @property {string} name Site name shown in page titles.
 * @property {boolean} [official=false] Whether official wiki.
 * @property {undefined|'wiki-indent'} [uiClass]
 * @property {SiteSearchSettings} [search]
 */

/**
 * @typedef {Object} SiteSearchSettings
 * Re-configures the search rewrite module if needed.
 * @property {string} [oldName] Fandom site name shown in page titles.
 */

/**
 * @typedef {Object} _DerivedSiteRecordExtension
 * @property {string} parentRef wiki.gg domain name of another wiki record on the list.
 * @property {string} oldId Fandom domain name.
 */
/**
 * @typedef {SiteRecord & _DerivedSiteRecordExtension} DerivedSiteRecord
 * Additional record of an individual wiki. This will not be shown in the UI, and should only be used to redirect more
 * domains.
 */

/**
 * @typedef {Object} SiteListSpacer
 * Divides the wiki list in the settings UI, with a custom heading. Records that should be visually "grouped up" under
 * this spacer should use the 'wiki-indent' UI class.
 * @property {string} spacer Title.
 */

/**
 * @typedef {SiteRecord|DerivedSiteRecord|SiteListSpacer} SiteListEntity
 */

/**
 * @typedef {Object} SiteListUnpackOptions
 * @property {boolean} [withSpacers=false] Whether spacers should be included.
 * @property {boolean} [withVirtuals=false] Whether derived records should be included.
 * @property {boolean} [compacted=true]
 */


/**
 * Converts an unprocessed sites list to a shallow, single level, filtered array.
 *
 * @package
 * @param {( SiteListEntity | SiteListEntity[] )[]} entities Unprocessed sites list.
 * @param {SiteListUnpackOptions} options
 * @return {SiteListEntity[]} Filtered, single level sites list.
 */
function _unpackSiteArray( entities, options ) {
    options = options || {};

    let out = [];
    for ( const entity of entities ) {
        // Skip the instructions at the top of the file
        if ( '$README' in entity ) {
            continue;
        }

        // Skip spacers if they have not been requested
        if ( ( !options.withSpacers && 'spacer' in entity ) || ( !options.withVirtuals && 'parentRef' in entity ) ) {
            continue;
        }

        // Recurse if an array, or append
        if ( Array.isArray( entity ) ) {
            const unpacked = _unpackSiteArray( entity, options );
            if ( options.compacted ?? true ) {
                out = out.concat( unpacked );
            } else {
                out.push( unpacked );
            }
        } else {
            out.push( entity );
        }
    }

    return out;
}


/**
 * Processes raw sites list: converts into a shallow array, filters per settings, expands derived records.
 *
 * TODO: Use SiteListUnpackOptions.
 *
 * @public
 * @param {boolean} [withSpacers=false]
 * @param {boolean} [withVirtuals=false]
 * @param {boolean} [compacted=true]
 * @return {SiteListEntity[]}
 */
export function getWikis( withSpacers, withVirtuals, compacted ) {
    const out = _unpackSiteArray( sites, {
        withSpacers,
        withVirtuals,
        compacted
    } );

    if ( withVirtuals ) {
        for ( const entity of out ) {
            // Resolve the parent reference for virtual entries (wiki alternative redirects). Copy properties that
            // aren't specified.
            // Additionally, this reference should be a string, which means it has not been resolved yet. The site list
            // may be reused in memory.
            if ( 'parentRef' in entity && typeof entity.parentRef === 'string' ) {
                entity.parentRef = out.find( x => x.id === entity.parentRef );
                entity.id = entity.parentRef.id;
                entity.name = entity.parentRef.name;
                entity.official = entity.parentRef.official;
            }
        }
    }

    return out;
}


/**
 * Returns the extension's storage interface.
 *
 * TODO: Untyped return value.
 *
 * @deprecated since 20241011, use chrome.storage directly
 * @return {any}
 */
export function getNativeSettings() {
    return chrome && chrome.storage || window.storage;
}


function _fetchDeepKey( obj, path ) {
    let itIndex = 0;
    // eslint-disable-next-line no-empty
    while ( itIndex < path.length && ( obj = obj[ path[ itIndex++ ] ] ) ) {}
    return obj ?? null;
}


export async function getOption( path ) {
    return new Promise( resolve => {
        const segments = path.split( '.' );
        chrome.storage.local.get( segments[ 0 ], result => {
            resolve( _fetchDeepKey( result, segments ) ?? _fetchDeepKey( defaultSettingsFactory.SHARED, segments ) );
        } );
    } );
}


/**
 * @typedef {Object} DomElementFactoryOptions
 * @property {string[]?} [classes]
 * @property {string} [text]
 * @property {string|HTMLElement|HTMLElement?[]} [html]
 * @property {Record<string, string|undefined|boolean|number>} [attributes]
 * @property {Partial<CSSStyleDeclaration>} [style]
 * @property {Partial<{
 *     [ P in keyof HTMLElementEventMap ]: ( ( event: HTMLElementEventMap[ P ] ) => void ) | ( () => void )
 * }>} [events]
 * @property {HTMLElement} [appendTo]
 * @property {HTMLElement} [prependTo]
*/

/**
 * @param {keyof HTMLElementTagNameMap} tag
 * @param {DomElementFactoryOptions} options
 * @return {HTMLElement}
 */
export function createDomElement( tag, options ) {
    const result = document.createElement( tag );
    if ( options.text ) {
        result.innerText = options.text;
    }
    if ( options.html ) {
        if ( typeof options.html === 'string' ) {
            result.innerHTML = options.html;
        } else if ( Array.isArray( options.html ) ) {
            for ( const element of options.html ) {
                if ( element ) {
                    result.appendChild( element );
                }
            }
        } else {
            result.appendChild( options.html );
        }
    }
    if ( options.classes ) {
        result.classList.add( ...options.classes );
    }
    if ( options.attributes ) {
        for ( const key in options.attributes ) {
            const value = options.attributes[ key ];
            if ( value !== undefined && value !== null ) {
                result.setAttribute( key, `${value}` );
            }
        }
    }
    if ( options.style ) {
        for ( const key in options.style ) {
            const value = options.style[ key ];
            if ( value !== undefined && value !== null ) {
                result.style[ key ] = value;
            }
        }
    }
    if ( options.events ) {
        for ( const name in options.events ) {
            const listener = options.events[ name ];
            if ( listener ) {
                result.addEventListener( name, listener );
            }
        }
    }
    if ( options.appendTo ) {
        options.appendTo.appendChild( result );
    }
    if ( options.prependTo ) {
        options.prependTo.prepend( result );
    }
    return result;
}
