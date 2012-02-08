
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Soup = imports.gi.Soup;

const DBus = imports.dbus;
const NetworkManager = imports.gi.NetworkManager;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

/* We want to be notified via DBus when network connection is
 * up. Declare DBus interface and proxy
 *
 * Recognizing new connection enables us to update weather data
 * immediately when system resumes from suspend or hibernate. */
const NetworkManagerIFace = {
    name: 'org.freedesktop.NetworkManager',
    signals: [{ name: 'StateChanged',
                inSignature: 'i'}]
}

function NetworkManager2Extension() {
    this._init();
}

NetworkManager2Extension.prototype = {
    _init: function() {
        DBus.system.proxifyObject(this, 'org.freedesktop.NetworkManager',
                                  '/org/freedesktop/NetworkManager', this);
    }
};
DBus.proxifyPrototype(NetworkManager2Extension.prototype,
                      NetworkManagerIFace);


const ITEMS = [
    ['temphi', 'High'],
    ['templo', 'Low'],
    ['windchill', 'Windchill'],
    ['windspeed', 'Windspeed'],
    ['humidity', 'Humidity'],
    ['airpressure', 'Airpressure']
];

function WeatherMenuButton() {
    this._init.apply(this, arguments);
}

WeatherMenuButton.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        let menuAlignment = 0.25;
        if (St.Widget.get_default_direction() == St.TextDirection.RTL) {
            menuAlignment = 1.0 - menuAlignment;
        }
        PanelMenu.Button.prototype._init.call(this, menuAlignment);

        this.tempnow = new St.Label({text: _("Loading...")});
        this.actor.add_actor(this.tempnow);

        let hbox = new St.BoxLayout({name: 'weather-details-area'});
        this.menu.addActor(hbox);

        this.detailLabels = new St.BoxLayout({
            name: 'weather-detail-labels',
            style_class: 'weather-detail-labels',
            vertical: true
        });
        hbox.add(this.detailLabels);

        let label;
        for (i in ITEMS) {
            label = new St.Label({text: _(ITEMS[i][1])});
            this.detailLabels.add(label);
        }

        this.detailValues = new St.BoxLayout({
            name: 'weather-detail-values',
            style_class: 'weather-detail-values',
            vertical: true
        });
        hbox.add(this.detailValues);

        this._dbus = new NetworkManager2Extension();
        // Update data immediately after network is up.
        this._dbus
            .connect('StateChanged',
                     Lang.bind(this, function(o, state) {
                         if (state = NetworkManager.DeviceState.ACTIVATED) {
                             this.update(false);
                         }
                     }));
    },

    _getData: function(callback) {
        var request = Soup.Message.new('GET', 'http://weather.willab.fi/weather.xml');
        _httpSession.queue_message(request, function(_httpSession, message) {
            if (message.status_code !== 200) {
                callback(message.status_code, null);
                return;
            }
            callback(null, request);
        });
    },

    updateData: function(recurse) {
        let self = this;
        this._getData(function(s,r) {
            let response = r.response_body.data.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
            let data = new XML(response);
            self._refreshView(data);

        });

        if (recurse) {
            Mainloop.timeout_add_seconds(1800, function() {
                self.updateData(true);
            });
        }
    },

    _refreshView: function(data) {
        function format(el) {
            return el + ' ' + el.@unit;
        }

        this.tempnow.set_text(format(data.weather.tempnow));

        this.detailValues.destroy_children();
        let value;
        for (i in ITEMS) {
            value = new St.Label({text: format(data.weather[ITEMS[i][0]])});
            this.detailValues.add(value);
        }
    }
};


let weather;

function init() {
    weather = new WeatherMenuButton();
}

function enable() {
    Main.panel._centerBox.insert_actor(weather.actor, 0);
    weather.updateData(true);
}

function disable() {
    Main.panel._centerBox.remove_actor(weather.actor);
    weather.destroy();
}
