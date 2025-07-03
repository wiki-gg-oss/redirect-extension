/**
 * @typedef {Object} SearchModuleSettings
 * @property {'filter'|'rewrite'|'none'|'disarm'} mode
 */


/**
 * @typedef {Object} ExtensionSettings
 * @property {number} version
 * @property {false|banner|true} isRedirectDisabled Whether Fandom sites should be redirected.
 * @property {string[]} disabledWikis List of disabled wikis, by ID.
 * @property {boolean} useTabRedirect Whether legacy redirection method should be used. Not implemented.
 * @property {Record<string, SearchModuleSettings>} sfs Search filtering settings, per module.
 * @property {'none'|'filter'|'rewrite'} searchMode [DEPRECATED] Search integration behaviour choice.
 * @property {boolean} ddgEnable [DEPRECATED] Whether DuckDuckGo search integration should be enabled.
 */


/**
 * Returns default extension settings.
 *
 * @return {ExtensionSettings}
 */
function createFreshSet() {
    return {
        version: 0,

        isRedirectDisabled: false,
        disabledWikis: [],

        // Developer settings - subject to change
        useTabRedirect: true,
        useRuntimeLists: false,
        rtListLastSyncTime: 0,
        // Feature flags
        ffUseOptimisedSearchCore: true,

        // Legacy search engine settings - this should be migrated and dropped in 1.7.0
        searchMode: 'rewrite',
        ddgEnable: true,

        // Search filtering settings - this should match SearchFilterSettings.engines
        sfs: {
            google: {
                mode: 'rewrite'
            },
            ddg: {
                mode: 'rewrite'
            }
        },

        // Runtime sites list
        rtList: {
            version: 0,
            data: null,
            hasAutoSyncConsent: false,
            lastSyncTime: 0
        }
    };
}


createFreshSet.SHARED = Object.freeze( createFreshSet() );


export default createFreshSet;
