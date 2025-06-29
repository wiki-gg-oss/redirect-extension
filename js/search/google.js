/** @typedef {import( '../util.js' ).SiteRecord} SiteRecord */
'use strict';


import { getWikis } from '../util.js';
import {
    GenericSearchModule,
    prepareWikisInfo,
    crawlUntilParentFound,
    awaitElement,
    RewriteUtil
} from './baseSearch.js';
import { constructRedirectBadge } from './components.js';


const TRY_DEFUSE_CLICK_TRACKING = true;


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


class GoogleSearchModule extends GenericSearchModule {
    FIRST_RESULTS_CONTAINER_SELECTOR = 'div.MjjYud, div.g, .xpd';
    RESULTS_CONTAINER_CLASS = 'div.MjjYud, div.g';
    SITE_NETWORK_TITLE_SELECTOR =
        // Desktop
        'span.VuuXrf'
        // Mobile
        + ', div.GkAmnd.ZaCDgb.RES9jf.q8U8x.OSrXXb.wHYlTd';
    EXTERNAL_LINK_SELECTOR =
        // Desktop
        'h3 > a.l, span > a[data-ved]'
        // Mobile: Top link
        + ', .OhZyZc > a[data-ved]'
        // Mobile: Site links
        + ', div.DkX4ue.Va3FIb.EE3Upf.lVm3ye > a[data-hveid]';
    TRANSLATE_SELECTOR = '.LAWljd + .fl[ping], .fl.iUh30';
    RESULT_HEADING_SELECTOR =
        // Desktop
        'h3'
        // Mobile
        + ', div.F0FGWb.v7jaNc.ynAwRc.MBeuO.q8U8x > div > span';
    MOBILE_BREADCRUMB_SELECTOR = 'div.kb0PBd.cvP2Ce > span.nC62wb, .sCuL3 > div';
    RESULT_SIDEPANEL_SELECTOR = 'div[jsslot] > div[jsname="I3kE2c"]';
    MORE_FROM_NETWORK_SELECTOR = 'a.fl[href*="site:fandom.com"]';
    NEW_SITELINKS_SELECTOR = 'li.KTAFWb > a.dM1Yyd';


    #isMobile = false;


    /**
     * @protected
     * @return {string}
     */
    getId() {
        return 'google';
    }

    initialise() {
        this.#isMobile = !!document.querySelector( '#navd' );
    }


    /**
     * Finds a general result container for a given element, if any.
     *
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        const result = crawlUntilParentFound( element, this.FIRST_RESULTS_CONTAINER_SELECTOR );
        // We might be in another result container, and if so, there's a table with more results
        const upperContainer = crawlUntilParentFound( result, this.RESULTS_CONTAINER_CLASS, 5 );
        return upperContainer ?? result;
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} boundaryElement
     * @return {HTMLElement?}
     */
    findNearestGgResult( wikiInfo, boundaryElement ) {
        for ( const node of document.querySelectorAll( wikiInfo.search.goodSelector ) ) {
            if ( node.compareDocumentPosition( boundaryElement ) & 0x02 ) {
                return crawlUntilParentFound( node, this.RESULTS_CONTAINER_CLASS );
            }
        }
        return null;
    }

    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {string} rootDomain
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async hideResult( wikiInfo, _rootDomain, containerElement, _foundLinkElement ) {
        super.hideResult( wikiInfo, containerElement, _foundLinkElement );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {string} rootDomain
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async replaceResult( wikiInfo, rootDomain, containerElement, _foundLinkElement ) {
        const oldDomain = `${wikiInfo.oldId || wikiInfo.id}.${rootDomain}`,
            newDomain = `${wikiInfo.id}.wiki.gg`;

        const badgeElement = constructRedirectBadge( {
            isGoogleMobile: this.#isMobile,
            allMoved: true
        } );

        // Rewrite the network header
        const networkHeader = containerElement.querySelector( this.SITE_NETWORK_TITLE_SELECTOR );
        if ( networkHeader ) {
            networkHeader.textContent = 'wiki.gg';
            networkHeader.appendChild( badgeElement );
        }
        // Rewrite links
        for ( const subLinkElement of containerElement.querySelectorAll( this.EXTERNAL_LINK_SELECTOR ) ) {
            RewriteUtil.doLink( wikiInfo, rootDomain, subLinkElement );
        }
        // Rewrite title
        for ( const h3 of containerElement.querySelectorAll( this.RESULT_HEADING_SELECTOR ) ) {
            RewriteUtil.doH3( wikiInfo, h3 );
            // Insert a badge indicating the result was modified if we haven't done that already (check heading and
            // result group)
            if ( !badgeElement.parentElement ) {
                h3.parentNode.parentNode.insertBefore( badgeElement, h3.parentNode.nextSibling );
            }
        }
        // Rewrite translate link
        for ( const translate of containerElement.querySelectorAll( this.TRANSLATE_SELECTOR ) ) {
            RewriteUtil.doLink( wikiInfo, rootDomain, translate );
        }
        // Rewrite URL element
        if ( !this.#isMobile ) {
            for ( const cite of containerElement.getElementsByTagName( 'cite' ) ) {
                if ( cite.firstChild.textContent ) {
                    cite.firstChild.textContent = cite.firstChild.textContent.replace( oldDomain, newDomain );
                }
            }
        } else {
            const mobileBreadcrumb = containerElement.querySelector( this.MOBILE_BREADCRUMB_SELECTOR );
            if ( mobileBreadcrumb ) {
                mobileBreadcrumb.textContent = mobileBreadcrumb.textContent.replace( oldDomain, newDomain );
            }
        }
        // Look for "More results from" in this result group and switch them onto wiki.gg
        for ( const moreResults of containerElement.querySelectorAll( this.MORE_FROM_NETWORK_SELECTOR ) ) {
            moreResults.href = moreResults.href.replace( `site:${rootDomain}`, 'site:wiki.gg' )
                .replace( `site:${wikiInfo.oldId || wikiInfo.id}.${rootDomain}`, `site:${wikiInfo.id}.wiki.gg` );
            moreResults.innerText = moreResults.innerText.replace( rootDomain, 'wiki.gg' );
        }
        // Rewrite new sitelinks boxes
        for ( const sitelink of containerElement.querySelectorAll( this.NEW_SITELINKS_SELECTOR ) ) {
            RewriteUtil.doLink( wikiInfo, rootDomain, sitelink );
        }
        // Hide the side-panel button - there's no point in attempting to rewrite it
        const sidePanelButton = containerElement.querySelector( this.RESULT_SIDEPANEL_SELECTOR );
        if ( sidePanelButton ) {
            sidePanelButton.style.display = 'none';
        }

        if ( TRY_DEFUSE_CLICK_TRACKING ) {
            containerElement.addEventListener( 'click', event => event.stopPropagation() );
        }
    }
}


// Set up an observer for dynamically loaded results
const bottomStuff = document.querySelector( '#botstuff > div' );
if ( bottomStuff ) {
    awaitElement(
        bottomStuff,
        '[jscontroller="ogmBcd"] > [data-async-rclass="search"] + div',
        dynContainer => {
            const dynamicObserver = new MutationObserver( updates => {
                for ( const update of updates ) {
                    if ( update.addedNodes && update.addedNodes.length > 0 ) {
                        for ( const addedNode of update.addedNodes ) {
                            // This container shows up before the results are built/added to the DOM
                            awaitElement(
                                addedNode,
                                'div',
                                results => GoogleSearchModule.invoke( wikis, results )
                            );
                        }
                    }
                }
            } );
            dynamicObserver.observe( dynContainer, {
                childList: true
            } );
        }
    );
}
// Run the initial filtering
GoogleSearchModule.invoke( wikis );
