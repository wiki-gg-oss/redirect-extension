/** @typedef {import( '../util.js' ).SiteRecord} SiteRecord */


import {
    createDomElement,
    getMessage
} from '../util.js';


/**
 * @typedef {Object} RedirectBadgeOptions
 * @property {boolean} [allMoved=false]
 * @property {boolean} [isGoogleMobile=false]
 * @property {Partial<CSSStyleDeclaration>?} [theme]
 */


/**
 * @param {RedirectBadgeOptions} options
 * @return {HTMLElement}
 */
export function constructRedirectBadge( options ) {
    return createDomElement( 'span', {
        style: Object.assign( {
            backgroundColor: '#c3216b33',
            fontSize: '90%',
            opacity: 0.8,
            border: '1px solid #c3216b60',
            borderRadius: '4px',
            padding: '1px 6px',
            verticalAlign: 'middle',
            marginLeft: options.isMobile ? null : '0.8em',
            textDecoration: 'none'
        }, options.theme ?? {} ),
        html: [
            document.createTextNode(
                getMessage( options.allMoved ? 'search_component_redirected' : 'search_component_redirected_partial' )
            ),
            createDomElement( 'img', {
                attributes: {
                    src: chrome.runtime.getURL( '/icons/redirectBadge.svg' )
                },
                style: {
                    verticalAlign: 'middle',
                    width: '0.8em',
                    height: '0.8em',
                    marginLeft: '0.4em'
                }
            } )
        ]
    } );
}


/**
 * @param {SiteRecord} wikiInfo
 * @return {HTMLElement}
 */
export function constructReplacementMarker( wikiInfo ) {
    return createDomElement( 'span', {
        text: `Result from ${wikiInfo.search.placeholderTitle} hidden by wiki.gg Redirect`,
        style: {
            paddingBottom: '1em',
            display: 'inline-block',
            color: '#5f6368'
        }
    } );
}


/**
 * @param {SiteRecord} wikiInfo
 * @return {HTMLElement}
 */
export function constructDisabledResultControl( wikiInfo ) {
    return createDomElement( 'aside', {
        classes: [ 'ggr-disarmed-control' ],
        style: {
            backgroundImage: `
                linear-gradient( 45deg, #220942 0%, #420a46 100% ),
                linear-gradient( 60deg, transparent 40%, #52145190 100% )
            `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
        },
        html: [
            createDomElement( 'a', {
                text: 'Read about "$1" on wiki.gg instead'
            } )
        ]
    } );
}
