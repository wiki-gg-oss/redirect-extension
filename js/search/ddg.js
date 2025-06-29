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


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


class DdgSearchModule extends GenericSearchModule {
    ENGINE_LAYOUT_SELECTOR = '#react-layout';
    RESULT_CONTAINER_SELECTOR = 'article[ data-nrn="result" ]';
    URL_ELEMENT_SELECTOR = '.Wo6ZAEmESLNUuWBkbMxx';
    SPAN_TITLE_ELEMENT_SELECTOR = '.eVNpHGjtxRBq_gLOfGDr span';
    ANCHOR_ELEMENT_SELECTOR = '.Rn_JXVtoPVAFyGkcaXyK span';


    /**
     * @protected
     * @return {string}
     */
    getId() {
        return 'ddg';
    }


    /**
     * Finds a general result container for a given element, if any.
     *
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        return crawlUntilParentFound( element, this.RESULT_CONTAINER_SELECTOR );
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
                return crawlUntilParentFound( node, this.RESULT_CONTAINER_SELECTOR );
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
    async hideResult( wikiInfo, rootDomain, containerElement, _foundLinkElement ) {
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
        // Rewrite anchor href links
        for ( const a of containerElement.getElementsByTagName( 'a' ) ) {
            RewriteUtil.doLink( wikiInfo, rootDomain, a );
        }

        // Rewrite title and append a badge
        const titleSpans = containerElement.querySelectorAll( this.SPAN_TITLE_ELEMENT_SELECTOR );
        for ( const span of titleSpans ) {
            if ( wikiInfo.search.titlePattern.test( span.textContent ) ) {
                RewriteUtil.doH3( wikiInfo, span );
            }
        }

        // Insert our badge
        const badgeElement = constructRedirectBadge( {
            allMoved: true,
            theme: {
                fontSize: '60%',
            }
        } );
        titleSpans[ 0 ].appendChild( badgeElement );

        // Rewrite URL breadcrumb
        for ( const url of containerElement.querySelectorAll( this.ANCHOR_ELEMENT_SELECTOR ) ) {
            RewriteUtil.doUrlSpan( wikiInfo, url );
        }
    }
}


awaitElement(
    document.getElementById( 'react-layout' ),
    'div > div > section',
    sectionNode => {
        awaitElement(
            sectionNode,
            '.react-results--main',
            node => {
                DdgSearchModule.invoke( wikis, node );
            }
        );
    }
);
