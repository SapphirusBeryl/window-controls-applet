// This program is free software:
//
//    You can redistribute it and/or modify it under the terms of the
//    GNU General Public License as published by the Free Software
//    Foundation, either version 3 of the License, or (at your option)
//    any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

const Window = imports.ui.windowManager;
const PanelManager = imports.ui.panel;
const St = imports.gi.St;
const Lang = imports.lang;
const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const Settings = imports.ui.settings;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const GnomeSession = imports.misc.gnomeSession;


function WindowButtonApplet(orientation,metadata, panelHeight, instance_id) {

	this._init(orientation,metadata, panelHeight, instance_id);
}

WindowButtonApplet.prototype = {

        __proto__: Applet.Applet.prototype,
        
	_init: function(orientation,metadata, panelHeight,  instance_id) { 
		Applet.Applet.prototype._init.call(this, orientation, panelHeight,  instance_id);
		this.instance_id=instance_id;
		this.appletPath=metadata.path;                         
		try {
			this.init_settings();
			this.initialize_events();
			this.initialize_buttons();
        		this.on_panel_edit_mode_changed();
			this.toggleButtons(!this.onlyMaximized);
			global.log("[WTDEBUG] Complete!");
		} catch (e) {
			global.logError(e);
		}
	},
	initialize_events: function() {

		let tracker = Cinnamon.WindowTracker.get_default();
		Main.themeManager.connect("theme-set", Lang.bind(this, this.loadTheme));
		tracker.connect('notify::focus-app', Lang.bind(this, this._windowChange));
                global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed));
                global.window_manager.connect('maximize', Lang.bind(this, this._windowChange));
                global.window_manager.connect('unmaximize', Lang.bind(this, this._windowChange));
               	global.window_manager.connect('minimize', Lang.bind(this, this._windowChange));
		global.window_manager.connect('destroy', Lang.bind(this, this._destroy));
		global.screen.connect('window-entered-monitor', Lang.bind(this, this._windowChange));
		global.screen.connect('window-left-monitor', Lang.bind(this, this._windowChange));

	},
	initialize_buttons: function() {
		let buttons=this.buttons_style.split(':');
                if(this.checkButton(buttons,'maximize') || this.checkButton(buttons,'minimize') || this.checkButton(buttons,'close')){
                        this.loadTheme();
                }
                this.button = [];
                this.createButtons(this.buttons_style);
		
        },
	init_settings: function() {
		this.settings = new Settings.AppletSettings(this, "window-buttons-fixed@sapphirus.org", this.instance_id);
                this.settings.bindProperty(Settings.BindingDirection.IN,"buttons-style","buttons_style",this.on_settings_changed,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"buttons-theme","buttonsTheme",null,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"only-maximized", "onlyMaximized",this.on_settings_changed,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"on-desktop-shutdown", "onDesktopShutdown",this.on_settings_changed,null);
	},
        on_panel_edit_mode_changed: function() {
                let reactive = !global.settings.get_boolean('panel-edit-mode');
                let b=this.buttons_style.split(':');
                for (let i=0; i < b.length; ++i ){
                        this.button[b[i]].reactive=reactive;
                }
        },
 	getCssPath: function(theme) {
        	let cssPath = this.appletPath + '/themes/'+theme+'/style.css';
		return cssPath;
        
    	},
	loadTheme: function(){
		this.actor.set_style_class_name("window-buttons");
		let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
		theme.load_stylesheet(this.getCssPath(this.buttonsTheme));
		this.oldTheme=this.buttonsTheme;
	},
	createButtons: function(buttonsStyle) {
     		buttonsStyle=buttonsStyle.split(':');
     		for (let i=0; i < buttonsStyle.length; ++i ){
     			let buttonName=buttonsStyle[i]+"Button";
     		 	this[buttonName]();
     		}
    
 	},
	minimizeButton:function () {      
		this.button['minimize'] = new St.Button({ name: 'windowButton', style_class: 'minimize window-button', reactive: true });
            	this.actor.add(this.button['minimize']);
            	this.button['minimize'].connect('button-press-event', Lang.bind(this,function(actor,event){
            		let button = event.get_button();
            	 	if (button == 1) {
               			this.minimizeWindow();
            			return true;
            		} else if(button == 3) {
            			this._applet_context_menu.toggle();
            			return true;
			}
           		return false;
            	}));
	},
      
	minimizeWindow: function() {
		let activeWindow = global.display.focus_window;
		let tracker = Cinnamon.WindowTracker.get_default();
		let app = tracker.get_window_app(activeWindow);
	 	if (app) { 
		     activeWindow.minimize();   
        	}
   	},
    
	maximizeButton: function () {    
		this.button['maximize'] = new St.Button({ name: 'windowButton', style_class: 'maximize window-button', reactive: true });
		this.actor.add(this.button['maximize']);
            	
		this.button['maximize'].connect('button-press-event', Lang.bind(this,function(actor,event){
            		let button = event.get_button();
             		if (button == 1) {
            			this.maximizeWindow();
            			return true;
            		} else if(button == 3){
            			this._applet_context_menu.toggle();
            			return true;
			}
			return false;
            	}));
	},
       
	maximizeWindow: function() {
		let activeWindow = global.display.focus_window;
 		let tracker = Cinnamon.WindowTracker.get_default();
		let app = tracker.get_window_app(activeWindow);
		if(!activeWindow && !app){ 
			return;
		}
        	if (activeWindow.get_maximized()) {
            		activeWindow.unmaximize(3);
        	}  else {
            		activeWindow.maximize(3);
                }
	},
	closeButton: function () {     	
		this.button['close'] = new St.Button({ name: 'windowButton', style_class: 'close window-button', reactive: true });
		this.actor.add(this.button['close']);            
		this.button['close'].connect('button-press-event', Lang.bind(this,function(actor,event){
		let button = event.get_button();
			if (button == 1) {
				this.closeWindow();
            			return true;
            		} else if(button == 3){
            			this._applet_context_menu.toggle();
            			return true;
			}
            		return false;
		}));
	},
	closeWindow: function() {
		let activeWindow = global.display.focus_window;
		let tracker = Cinnamon.WindowTracker.get_default();
       		let app = tracker.get_window_app(activeWindow);
        	if (!app) {
			return;
		}
		activeWindow.delete(global.get_current_time());		
	},
	_windowChange: function(destroy=false) {
	    	if(this.onlyMaximized==true) {
			let w = global.display.focus_window;
                	let windowType = (w.get_window_type() == Meta.WindowType.DESKTOP);
			let thisMonitor = (w.get_monitor() == this.panel.monitorIndex);
			let toggle = (w.get_maximized() && w.has_focus() && !w.minimized && thisMonitor && !windowType && w);
			this.toggleButtons(toggle);
		}
	}, 
	_destroy: function() {
		this.toggleButtons(false);
	},
	on_settings_changed: function() {
        	this.actor.destroy_all_children();
       		this.initialize_buttons();
    	},
	checkButton: function(arr, obj) {
		for(var i=0; i<arr.length; i++) {
			if (arr[i] == obj){ 
				return true;
			}
		}
		return null;
	},
	toggleButtons: function(toggle) {
		let buttons=this.buttons_style.split(':');
		for(var i=0; i < buttons.length; i++) {
			if(toggle) { this.button[buttons[i]].show(); } else { this.button[buttons[i]].hide(); }
		}
	},
}
function main(metadata,orientation, panelHeight,  instance_id) {  
    //appletPath = metadata.path; 
    let myApplet = new WindowButtonApplet(orientation,metadata, panelHeight, instance_id);
    return myApplet;      
}
