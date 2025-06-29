/** @typedef {import( '../util.js' ).SiteRecord} SiteRecord */

import { getNativeSettings } from '../util.js';
import defaultSettingsFactory from '../../defaults.js';
import { constructReplacementMarker } from './components.js';


/**
 * @abstract
 */
export class SearchModule {
    static MARKER_ATTRIBUTE = 'data-ggr-checked';

    /**
     * @abstract
     * @protected
     * @return {string}
     */
    getId() {
        throw new Error( `${this.constructor.name}.getId not implemented.` );
    }


    /**
     * @protected
    */
    initialise() {}


    /**
     * @abstract
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async replaceResult( wikiInfo, containerElement, foundLinkElement ) {
        throw new Error( `${this.constructor.name}.replaceResult not implemented.` );
    }


    /**
     * @abstract
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async hideResult( wikiInfo, containerElement, foundLinkElement ) {
        throw new Error( `${this.constructor.name}.hideResult not implemented.` );
    }


    /**
     * @abstract
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async disarmResult( wikiInfo, containerElement, foundLinkElement ) {
        throw new Error( `${this.constructor.name}.disarmResult not implemented.` );
    }


    /**
     * Finds a general result container for a given element, if any.
     *
     * @abstract
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        throw new Error( `${this.constructor.name}._resolveResultContainer not implemented.` );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} boundaryElement
     * @return {HTMLElement?}
     */
    findNearestGgResult( wikiInfo, boundaryElement ) {
        return null;
    }


    static async invoke( wikis, rootNode ) {
        rootNode = rootNode || document;

        const instance = new ( this )(),
            id = instance.getId();

        getNativeSettings().local.get( [
            'sfs',
            'disabledWikis'
        ], result => {
            result = result ?? defaults;

            const
                defaults = defaultSettingsFactory(),
                settings = ( result.sfs ?? defaults.sfs )[ id ] ?? defaults.sfs[ id ],
                doRoutine = instance[ {
                    filter: 'hideResult',
                    rewrite: 'replaceResult',
                    disarm: 'disarmResult'
                }[ settings.mode ] ];

            if ( !doRoutine ) {
                return;
            }

            const disabledWikis = result.disabledWikis || defaults.disabledWikis;

            instance.initialise();

            // TODO: merge selectors and run that query, then determine the wiki
            for ( const wikiInfo of wikis ) {
                if ( wikiInfo.bannerOnly || disabledWikis.includes( wikiInfo.id ) ) {
                    continue;
                }

                for ( const element of rootNode.querySelectorAll( wikiInfo.search.badSelector ) ) {
                    const container = instance.resolveResultContainer( element );
                    if ( container !== null && container.parentElement !== null && !container.getAttribute( SearchModule.MARKER_ATTRIBUTE ) ) {
                        doRoutine.call( instance, wikiInfo, container, element );
                        container.setAttribute( SearchModule.MARKER_ATTRIBUTE, true );
                    }
                }
            }
        } );
    }
}


/**
 * @abstract
 */
export class GenericSearchModule extends SearchModule {
    DISABLED_RESULT_CLASS = 'ggr-disarmed';


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async hideResult( wikiInfo, containerElement, _foundLinkElement ) {
        // Try to find the first wiki.gg result after this one
        const ggResult = this.findNearestGgResult( wikiInfo, containerElement );

        let replacement;
        if ( ggResult ) {
            replacement = ggResult;
        } else {
            replacement = constructReplacementMarker( wikiInfo );
        }
        containerElement.parentNode.replaceChild( replacement, containerElement );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async disarmResult( wikiInfo, containerElement, foundLinkElement ) {
        const controlElement = constructDisabledResultControl( wikiInfo );
        containerElement.prepend( controlElement );
        containerElement.classList.add( this.DISABLED_RESULT_CLASS );
    }
}


export function prepareWikisInfo( wikis, options ) {
    for ( const wiki of wikis ) {
        // Generate search properties if not provided already
        if ( !wiki.search ) {
            wiki.search = {};
        }
        if ( options.titles ) {
            if ( !wiki.search.titlePattern ) {
                const escapedName = ( wiki.search.oldName || wiki.name ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
                // eslint-disable-next-line security/detect-non-literal-regexp
                wiki.search.titlePattern = new RegExp( `(Official )?${escapedName} (\\| |- )?(Wiki|Fandom)( (-|\\|) Fandom)?$`,
                    'i' );
            }
            if ( !wiki.search.placeholderTitle ) {
                wiki.search.placeholderTitle = `${wiki.search.oldName || wiki.name} Fandom`;
            }
            if ( !wiki.search.newTitle ) {
                wiki.search.newTitle = ( wiki.search.official ? 'Official ' : '' ) + `${wiki.name}`;
                if ( !wiki.search.newIncludesWiki ) {
                    wiki.search.newTitle += ' Wiki';
                }
            }
        }
        if ( options.selectors ) {
            wiki.search.goodSelector = 'a[href*="://' + wiki.id + '.wiki.gg"]';
            wiki.search.badSelector = ( wiki.oldIds || [ wiki.oldId || wiki.id ] ).map(
                id => `a[href*="://${id}.fandom.com"], a[href*="://${id}.gamepedia.com"]` ).join( ', ' );
        }
    }

    return wikis;
}


/**
 * Locates an ancestor that matches the given selector.
 *
 * If max depth is not given, this is equivalent to a simple null sanity check and a `closest` call for performance
 * reasons.
 *
 * @param {HTMLElement} element 
 * @param {string} selector 
 * @param {int} [maxDepth=-1]
 * @return {HTMLElement?}
 */
export function crawlUntilParentFound( element, selector, maxDepth = -1 ) {
    if ( element === null || element.parentElement === null ) {
        return null;
    }

    if ( maxDepth === -1 ) {
        return element.closest( selector );
    }

    element = element.parentElement;
    if ( maxDepth > 0 ) {
        if ( element.matches( selector ) ) {
            return element;
        }
        return crawlUntilParentFound( element, selector, maxDepth - 1 );
    }
    return null;
}


export function awaitElement( knownParent, selector, callback ) {
    let node = knownParent.querySelector( selector );
    if ( node ) {
        return callback( node );
    }

    const observer = new MutationObserver( () => {
        node = knownParent.querySelector( `:scope > ${selector}` );
        if ( node ) {
            observer.disconnect();
            return callback( node );
        }
    } );
    observer.observe( knownParent, {
        childList: true
    } );
}


export const RewriteUtil = {
    doLink( wiki, link ) {
        if ( link.tagName.toLowerCase() !== 'a' ) {
            return;
        }
        
        let href = link.href;
        if ( href.startsWith( '/url?' ) ) {
            href = ( new URLSearchParams( link.href ) ).get( 'url' );
        }

        if ( !href.includes( wiki.oldId || wiki.id ) ) {
            return;
        }

        link.href = href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
        // Defuse Google's hijacking protection - replacing with the new wiki's link will trigger it
        if ( link.getAttribute( 'data-jsarwt' ) ) {
            link.setAttribute( 'data-jsarwt', '0' );
        }
        // Defuse pingbacks
        link.removeAttribute( 'ping' );
    },


    doH3( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent ) {
                child.textContent = child.textContent.replace( wiki.search.titlePattern, wiki.search.newTitle )
            } else {
                this.doH3( wiki, child );
            }
        }
    },


    doUrlSpan( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent ) {
                child.textContent = child.textContent.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
            } else {
                this.doUrlSpan( wiki, child );
            }
        }
    }
};
