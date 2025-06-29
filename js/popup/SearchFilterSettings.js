import {
    createDomElement,
    getMessage,
    isDevelopmentBuild
} from "../util.js";


/**
 * @typedef {Object} SearchEngineInfo
 * @property {string} id
 * @property {boolean} supportsFilter
 * @property {boolean} supportsRewrite
 */


export default class SearchFilterSettings {
    /** @type {SearchEngineInfo[]} */
    static engines = [
        {
            id: 'google',
            supportsFilter: true,
            supportsRewrite: true,
        },
        {
            id: 'ddg',
            supportsFilter: true,
            supportsRewrite: true,
        },
    ];


    /**
     * @param {HTMLTableElement} table
     */
    static initialise( table ) {
        const tbody = table.tBodies[ 0 ];
        for ( const info of this.engines ) {
            createDomElement( 'tr', {
                html: [
                    createDomElement( 'td', {
                        text: getMessage( `sfs_engine_${info.id}` ),
                    } ),
                    createDomElement( 'select', {
                        attributes: {
                            name: `sfs_mode_${info.id}`,
                            'data-component': 'DeclarativeSettings',
                            'data-key': `sfs.${info.id}.mode`,
                        },
                        html: [
                            createDomElement( 'option', {
                                attributes: {
                                    value: 'rewrite'
                                },
                                text: getMessage( 'sfs_rewrite' )
                            } ),
                            createDomElement( 'option', {
                                attributes: {
                                    value: 'filter'
                                },
                                text: getMessage( 'sfs_filter' )
                            } ),
                            ( isDevelopmentBuild() ? createDomElement( 'option', {
                                attributes: {
                                    value: 'disarm'
                                },
                                text: '[PH]' + getMessage( 'sfs_disarm' )
                            } ) : '' ),
                            createDomElement( 'option', {
                                attributes: {
                                    value: 'none'
                                },
                                text: getMessage( 'sfs_none' )
                            } )
                        ]
                    } )
                ],
                appendTo: tbody
            } );
        }
    }


    static #createRadioCell( id, tooltipMsg, key, settingValue, meansInactive ) {
        return createDomElement( 'td', {
            html: createDomElement( 'input', {
                attributes: {
                    type: 'radio',
                    name: id,
                    title: getMessage( tooltipMsg ),
                    'data-component': 'DeclarativeSettings',
                    'data-key': key,
                    'data-value': settingValue,
                    'data-means-inactive': meansInactive ? true : null
                }
            } )
        } );
    }
}
