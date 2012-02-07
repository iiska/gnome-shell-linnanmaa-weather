
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Soup = imports.gi.Soup;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());


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

        this.detailLabels = new St.BoxLayout({name: 'weather-detail-labels',
                                              vertical: true});
        hbox.add(this.detailLabels);

        let label;
        label = new St.Label({text: "High"});
        this.detailLabels.add(label);
        label = new St.Label({text: "Low"});
        this.detailLabels.add(label);
        label = new St.Label({text: "Windchill"});
        this.detailLabels.add(label);
        label = new St.Label({text: "Humidity"});
        this.detailLabels.add(label);
        label = new St.Label({text: "Airpressure"});
        this.detailLabels.add(label);

        this.detailValues = new St.BoxLayout({name: 'weather-detail-values',
                                              vertical: true});
        hbox.add(this.detailValues);
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

        value = new St.Label({text: format(data.weather.temphi)});
        this.detailValues.add(value);
        value = new St.Label({text: format(data.weather.templo)});
        this.detailValues.add(value);
        value = new St.Label({text: format(data.weather.windchill)});
        this.detailValues.add(value);
        value = new St.Label({text: format(data.weather.humidity)});
        this.detailValues.add(value);
        value = new St.Label({text: format(data.weather.airpressure)});
        this.detailValues.add(value);

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
