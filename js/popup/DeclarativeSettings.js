import defaultSettingsFactory from '../../defaults.js';


const
    storage = window.storage || chrome.storage,
    knownKeys = [],
    updateCallbacks = [],
    userDefaults = defaultSettingsFactory(),
    debugMode = ( new URLSearchParams( location.search ) ).get( 'dsdebug' );
let
    settingsCache = {},
    updateCallbacksOneshot = [],
    updateCacheGuard = false;


function _normaliseValue( value ) {
    if ( value === 'true' ) {
        value = true;
    } else if ( value === 'false' ) {
        value = false;
    }
    return value;
}


function _trackKey( key ) {
    const sepIndex = key.indexOf( '.' );
    if ( sepIndex > 0 ) {
        key = key.slice( 0, sepIndex );
    }

    if ( !knownKeys.includes( key ) ) {
        knownKeys.push( key );
    }
}


function _getForKeyInternal( key ) {
    let mainStore = settingsCache,
        fallbackStore = userDefaults;

    // Advance stores if a sub-key was requested
    let sepIndex;
    while ( ( sepIndex = key.indexOf( '.' ) ) >= 0 ) {
        const upper = key.slice( 0, sepIndex ),
            lower = key.slice( sepIndex + 1 );
        mainStore = mainStore[ upper ] ?? {};
        fallbackStore = fallbackStore[ upper ] ?? {};
        key = lower;
    }

    return mainStore[ key ] ?? fallbackStore[ key ];
}


export function getForKey( key ) {
    return _normaliseValue( _getForKeyInternal( key ) );
}


export function setAtKey( key, value ) {
    value = _normaliseValue( value );

    if ( debugMode ) {
        console.log( `[DeclarativeSettings] setAtKey( '${key}', '${value}' )` )
    }

    let mainStore = settingsCache;

    // Advance stores if a sub-key was requested
    let sepIndex;
    while ( ( sepIndex = key.indexOf( '.' ) ) >= 0 ) {
        const upper = key.slice( 0, sepIndex ),
            lower = key.slice( sepIndex + 1 );
        mainStore = mainStore[ upper ] = mainStore[ upper ] ?? {};
        key = lower;
    }

    mainStore[ key ] = value;
    storage.local.set( settingsCache, () => updateCache() );
}


export function updateCache() {
    if ( updateCacheGuard ) {
        console.warn( `[DeclarativeSettings] Dropping out of a recursive updateCache() call` );
        return;
    }

    updateCacheGuard = true;

    storage.local.get( knownKeys, result => {
        settingsCache = result ?? {};
        if ( debugMode ) {
            console.log( `[DeclarativeSettings] updateCache() succeeded; `, settingsCache );
            console.log( `[DeclarativeSettings] Running ${updateCallbacks.length} callbacks` );
        }
        for ( const callback of updateCallbacks ) {
            callback( result );
        }

        if ( updateCallbacksOneshot.length ) {
            if ( debugMode ) {
                console.log( `[DeclarativeSettings] Running ${updateCallbacksOneshot.length} one-shot callbacks` );
            }
            for ( const callback of updateCallbacksOneshot ) {
                callback( result );
            }
            updateCallbacksOneshot = [];
        }

        updateCacheGuard = false;
    } );
}


export function registerUpdateCallback( callback ) {
    updateCallbacks.push( callback );
}


export function registerOneshotUpdateCallback( callback ) {
    updateCallbacksOneshot.push( callback );
}


export class Control {
    /**
     * @param {HTMLInputElement} inputElement
     */
    static initialise( inputElement ) {
        const key = inputElement.getAttribute( 'data-key' );
        _trackKey( key );

        if ( debugMode ) {
            console.log( `[DeclarativeSettings] Binding control for key '${key}': ${inputElement.type}; `,
                inputElement );
        }

        // Disable the input until update callbacks have run
        inputElement.disabled = true;
        registerOneshotUpdateCallback( () => ( inputElement.disabled = false ) );

        switch ( inputElement.type ) {
            case "radio":
                return this.#initialiseRadio( key, inputElement );
            case "checkbox":
                if ( inputElement.getAttribute( 'data-array-value' ) ) {
                    return this.#initialiseArrayCheckbox( key, inputElement );
                }
                return this.#initialiseCheckbox( key, inputElement );
            case 'select':
            case 'select-one':
                return this.#initialiseSelect( key, inputElement );
            default:
                console.warn( `[DeclarativeSettings] Unrecognised input type: ${inputElement.type}` );
        }
    }


    /**
     * @param {string} key
     * @param {HTMLInputElement} inputElement
     */
    static #initialiseRadio( key, inputElement ) {
        const value = _normaliseValue( inputElement.getAttribute( 'data-value' ) );

        inputElement.addEventListener( 'change', () => {
            if ( inputElement.checked ) {
                setAtKey( key, value );
            }
        } );

        registerUpdateCallback( () => {
            inputElement.checked = value === getForKey( key );
        } );
    }


    /**
     * @param {string} key
     * @param {HTMLSelectElement} inputElement
     */
    static #initialiseSelect( key, inputElement ) {
        inputElement.addEventListener( 'change', () => {
            setAtKey( key, _normaliseValue( inputElement.value ) );
        } );

        registerUpdateCallback( () => {
            inputElement.value = getForKey( key );
        } );
    }


    /**
     * @param {string} key
     * @param {HTMLInputElement} inputElement
     */
    static #initialiseCheckbox( key, inputElement ) {
        const
            valueOn = _normaliseValue( inputElement.getAttribute( 'data-on' ) ),
            valueOff = _normaliseValue( inputElement.getAttribute( 'data-off' ) );

        inputElement.addEventListener( 'change', () => {
            const value = inputElement.checked ? valueOn : valueOff;
            setAtKey( key, value );
        } );

        registerUpdateCallback( () => {
            inputElement.checked = valueOn === getForKey( key );
        } );
    }


    /**
     * @param {string} key
     * @param {HTMLInputElement} inputElement
     */
    static #initialiseArrayCheckbox( key, inputElement ) {
        const
            elementValue = inputElement.getAttribute( 'data-array-value' ),
            valueOn = _normaliseValue( inputElement.getAttribute( 'data-on' ) ),
            valueOff = _normaliseValue( inputElement.getAttribute( 'data-off' ) );

        inputElement.addEventListener( 'change', () => {
            let store = getForKey( key );
            if ( inputElement.checked ? valueOn : valueOff ) {
                store.push( elementValue );
            } else {
                store = store.filter( item => item !== elementValue );
            }
            setAtKey( key, store );
        } );

        registerUpdateCallback( () => {
            inputElement.checked = getForKey( key ).includes( elementValue ) === valueOn;
        } );
    }
}
