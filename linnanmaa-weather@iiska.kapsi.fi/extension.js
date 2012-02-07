
const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

let text, button;

function _getData(callback) {
    var request = Soup.Message.new('GET', 'http://weather.willab.fi/weather.xml');

    _httpSession.queue_message(request, function(_httpSession, message) {
      if (message.status_code !== 200) {
        callback(message.status_code, null);
        return;
      }
      callback(null, request);
    });
}

function _updateData() {
    _getData(function(s,r) {
        let response = r.response_body.data.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
        let data = new XML(response);
        text.set_text(data.weather.tempnow + data.weather.tempnow.@unit);
    });
}

function _showDetails() {
}

function init() {
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });

    let hbox = new St.BoxLayout({name: 'weather-button-area'});
    let icon = new St.Icon({ icon_name: 'weather-few-clouds',
                             icon_type: St.IconType.SYMBOLIC,
                             style_class: 'system-status-icon' });
    text = new St.Label({text: "-- C"});
    _updateData();
    hbox.add(icon);
    hbox.add(text);

    button.set_child(hbox);
    button.connect('button-press-event', _updateData);
}

function enable() {
    Main.panel._centerBox.insert_actor(button, 0);
    _updateData();

    //Mainloop.timeout_add_seconds(1800, function() {
    //    _updateData();
    //});
    //Mainloop.run('updatedata');
}

function disable() {
    //Mainloop.quit('updatedata');
    Main.panel._centerBox.remove_actor(button);
}
