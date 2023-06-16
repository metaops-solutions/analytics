/**
 * Kassette plugin
 * @param {object} pluginConfig - Plugin settings
 * @param {string} pluginConfig.apiKey - Kassette project API key
 * @param {object} pluginConfig.options - Kassette SDK options
 * @param {string} pluginConfig.initialSessionId - Set initial session ID
 * @return {*}
 * @example
 *
 * kassettePlugin({
 *   sourceId: 'id',
 *   endPoint: 'https://api.kassette.ai',
 *   }
 * })
 */
function kassettePlugin(pluginConfig = {}) {
  // Amplitude client instance.
  let client = null;
  // Flag is set to true after amplitude client instance is initialized.
  let kassetteInitCompleted = false;

  const initComplete = (d) => {
    client = d;
    kassetteInitCompleted = true;
  };

  return {
    name: "kassette",
    config: pluginConfig,

    initialize: ({ config }) => {
      const { sourceId, endpoint, initialSessionId, options = {} } = config
      if (!sourceId) {
        throw new Error("Kassette project sourceId is not defined")
      }
      if (!endpoint) {
        throw new Error("Kassette project EndPoint is not defined")
      }

      if (options && typeof options !== "object") {
        throw new Error("Kassette SDK options must be an object")
      }

      // Set initial session id. Ref https://bit.ly/3vElAym
      if (initialSessionId) {
        setTimeout(() => setSessionId(initialSessionId), 10)
      }
      Kassette.initialize(sourceId, endpoint)
    },

    page: ({ payload: { properties, options } }) => {
      let eventType = "Page View"
      if (options && options.eventType) {
        eventType = options.eventType
      }
      Kassette.getInstance().sendMetric(eventType, properties)
    },

    track: ({ payload: { event, properties } }) => {
      client.sendMetric(event, properties)
    },

    identify: ({ payload: { userId, traits }, instance }) => {
      client.setUserId(userId)
      client.setUserProperties(traits)
    },

    loaded: () => kassetteInitCompleted,

    // https://getanalytics.io/plugins/writing-plugins/#adding-custom-methods
    methods: {
      /**
       * analytics.plugins['kassette'].setSessionId('your-id')
       */
      setSessionId: setSessionId,
    }
  }
}

/**
 * @param {string} sessionId - Minimum visit length before first page ping event fires
 */
function setSessionId(sessionId) {
  if (typeof window.kassette === 'undefined') {
    console.log('Kassette not loaded yet')
    return false
  }
  const kassetteInstance = window.kassette.getInstance()
  kassetteInstance.setSessionId(sessionId)
}

window.post = function(url, data) {
  return fetch(url, {method: "POST", headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
}


const Kassette = (function () {
  function SingletonClass() {
    //do stuff
  }
  let sourceId = null;
  let endPoint = null;

  let instance;
  return {
    getInstance: function () {
      if (instance == null) {
        instance = new SingletonClass();
        // Hide the constructor so the returned object can't be new'd...
        instance.constructor = null;
      }
      return instance;
    },
    initialize: (sourceId, endPoint) => {
      this.sourceId = sourceId || null;
      this.endPoint = endPoint || null;
    },
    sendMetric: (type, {payload}) => {
      payload.type = type;
      payload.sourceId = sourceId;
      payload.userId = window.localStorage.getItem('kassette_user_id');
      payload.userTraits = JSON.parse(window.localStorage.getItem('kassette_user_properties'));
      window.post(endPoint, payload).then(r => console.log(r))
    },
    setUserId: (userId) => {
      window.localStorage.setItem('kassette_user_id', userId)
    },
    setUserProperties: (traits) => {
      window.localStorage.setItem('kassette_user_properties', JSON.stringify(traits))
    }
  };
})();

export default kassettePlugin