/* 	Window Controls Applet for the Cinnamon Desktop Environment
 * 	Copyright (C) 2017-2022  Xavier (sapphirus@azorium.net)
 *
 * 	This program is free software: you can redistribute it and/or modify
 * 	it under the terms of the GNU General Public License as published by
 * 	the Free Software Foundation, either version 3 of the License, or
 * 	(at your option) any later version.
 *
 * 	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 * 	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * 	GNU General Public License for more details.
 *
 * 	You should have received a copy of the GNU General Public License
 * 	along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const UUID = "window-controls-applet@sapphirus.org";

const St = imports.gi.St;
const Lang = imports.lang;
const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const Settings = imports.ui.settings;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const WindowTracker = imports.gi.Cinnamon.WindowTracker;

const _WindowTracker = WindowTracker.get_default();
const WorkspaceManager = global.display.get_workspace_manager();

const INFO = 0;
const VERBOSE = 1;
const ERROR = 2;
const ALL = 3;

class Logger {

	constructor(omittanceLevel, loggerName) {
		this.omittanceLevel = omittanceLevel;
		this.loggerName = loggerName;
	}

	log(lvl, log) {
		if(this.omittanceLevel < lvl)
			return;
		switch(lvl) {
			case ERROR:
				global.logError("["+this.loggerName+"]: " + log);
				break;

			default:
				global.log("["+this.loggerName+"] " + log);
				break;
		}
	}

	setLoggingLevel(level) {
		this.omittanceLevel = level;
	}

}

class WindowControlApplet extends Applet.Applet {
	constructor(metadata, orientation, panelHeight,  instance_id) { 
		super(orientation, panelHeight,  instance_id);
		this.logger = new Logger(INFO, UUID);
		this.appletPath=metadata.path;
		this.instance_id = instance_id;
		try {
			this._initialize_settings();
			this.logger.log(VERBOSE, "Intialised Settings!");
			this._initialize_events();
			this.logger.log(VERBOSE, "Intialised Events!");
			this._initialize_buttons();
			this.logger.log(VERBOSE, "Intialised Buttons!");
        		this._on_panel_edit_mode_changed();
			this._toggleButtons(!this.onlyMaximized);
			this.logger.log(INFO, "Initialisation Complete!");
		} catch (e) {
			this.logger.log(ERROR, e);
		}	
	}

	_initialize_events() {
		Main.themeManager.connect("theme-set", Lang.bind(this, this._loadTheme));
		WindowTracker.get_default().connect('notify::focus-app', Lang.bind(this, this._windowChange));
                global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this._on_panel_edit_mode_changed));
                global.window_manager.connect('size-changed', Lang.bind(this, this._windowChange));
               	global.window_manager.connect('minimize', Lang.bind(this, this._windowChange));
		global.window_manager.connect('destroy', Lang.bind(this, this._windowChange));
		global.display.connect('window-entered-monitor', Lang.bind(this, this._windowChange));
		global.display.connect('showing-desktop-changed', Lang.bind(this, this._windowChange));
	}
	_initialize_buttons() {
		let buttons=this.button_layout.split(':');
                if(this._checkButton(buttons,'maximize') || this._checkButton(buttons,'minimize') || this._checkButton(buttons,'close')){
                        this._loadTheme();
                }
                this.button = [];
                this._createButtons(this.button_layout);
        }

	_initialize_settings() {
		this.settings = new Settings.AppletSettings(this, UUID, this.instance_id);
                this.settings.bindProperty(Settings.BindingDirection.IN,"button-layout","button_layout",this._bind_settings,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"button-theme","button_theme", this._bind_settings,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"only-maximized", "onlyMaximized", this._bind_settings,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"verbose-log", "verbose_logging", this._set_logging,null);
		this._set_logging();
	}

	_set_logging() {
		let loggingLevel = (this.verbose_logging ? ALL : INFO);
		this.logger.log(VERBOSE, "Set logging level to "+loggingLevel);
		this.logger.setLoggingLevel(loggingLevel); 
	}
	_bind_settings() {
		this.actor.destroy_all_children(); 
		this._initialize_buttons();
    	}

        _on_panel_edit_mode_changed() {
                let reactive = !global.settings.get_boolean('panel-edit-mode');
                let b=this.button_layout.split(':');
                for (let i=0; i < b.length; ++i ){
                        this.button[b[i]].reactive=reactive;
                }
        }

 	_getCssPath(theme) {
        	let cssPath = this.appletPath + '/themes/'+theme+'/style.css';
		return cssPath;
    	}

	_loadTheme(){
		this.actor.set_style_class_name("window-buttons");
		let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
		let theme_path = this._getCssPath(this.button_theme);
		theme.load_stylesheet(theme_path);
	}

	_createButtons(buttonLayout) {
     		buttonLayout=buttonLayout.split(':');
     		for (let i=0; i < buttonLayout.length; ++i ){
     			let buttonName="_"+buttonLayout[i]+"Button";
     		 	this[buttonName]();
     		}
    
 	}

	_minimizeButton() { 
		this.button['minimize'] = new St.Button({ name: 'windowButton', style_class: 'minimize window-button', reactive: true });
            	this.actor.add(this.button['minimize']);
            	this.button['minimize'].connect('button-press-event', Lang.bind(this,function(actor,event){
            		let button = event.get_button();
            	 	if (button == 1) {
               			this._minimizeWindow();
            			return true;
            		} else if(button == 3) {
            			this._applet_context_menu.toggle();
            			return true;
			}
           		return false;
            	}));
	}
	
	_minimizeWindow() {
		let activeWindow = this._getActiveWindow();	
		let app = _WindowTracker.get_window_app(activeWindow);
		if(!activeWindow || !app) 
			return;
		activeWindow.minimize();
   	}

	_maximizeButton() {    
		this.button['maximize'] = new St.Button({ name: 'windowButton'+this.instance_id, style_class: 'maximize window-button', reactive: true });
		this.actor.add(this.button['maximize']);
            	
		this.button['maximize'].connect('button-press-event', Lang.bind(this,function(actor,event){
            		let button = event.get_button();
             		if (button == 1) {
            			this._maximizeWindow();
            			return true;
            		} else if(button == 3){
            			this._applet_context_menu.toggle();
            			return true;
			}
			return false;
            	}));
	}

	_maximizeWindow() {
		let activeWindow = this._getActiveWindow();
		let app = _WindowTracker.get_window_app(activeWindow);
		if(!activeWindow || !app) 
			return;

		if (activeWindow.get_maximized()) {
            		activeWindow.unmaximize(3);
        	}  else {
            		activeWindow.maximize(3);
                }
	}

	_closeButton() {     	
		this.button['close'] = new St.Button({ name: 'windowButton', style_class: 'close window-button', reactive: true });
		this.actor.add(this.button['close']);            
		this.button['close'].connect('button-press-event', Lang.bind(this,function(actor,event){
		let button = event.get_button();
			if (button == 1) {
				this._closeWindow();
            			return true;
            		} else if(button == 3){
            			this._applet_context_menu.toggle();
            			return true;
			}
            		return false;
		}));
	}

	_closeWindow() {
		let activeWindow = this._getActiveWindow();
		let app = _WindowTracker.get_window_app(activeWindow);
		if(!activeWindow || !app) 
			return;
		this.logger.log(INFO, "Closed!");	
		activeWindow.delete(global.get_current_time());		
	}

	_getActiveWindow() {
		let workspace = WorkspaceManager.get_active_workspace();
		let windows = workspace.list_windows();
		for (var i = 0; i < windows.length; i++) {
			let w = windows[i];
			let thisMonitor = (w.get_monitor() == this.panel.monitorIndex);
			if(!thisMonitor)
				continue;
			if(((w.get_maximized() === Meta.MaximizeFlags.BOTH) && (w.get_window_type() != Meta.WindowType.DESKTOP) && !w.minimized && thisMonitor))
				return w;	
		}
		return false;                      
	}

	_windowChange(destroy) {
	    	if(!this.onlyMaximized)
			return;
		if(!this._getActiveWindow()) this._toggleButtons(false); else this._toggleButtons(true);

	} 

	_checkButton(arr, obj) {
		for(var i=0; i<arr.length; i++) {
			if (arr[i] == obj){ 
				return true;
			}
		}
		return null;
	}

	_toggleButtons(toggle) {
		let buttons=this.button_layout.split(':');
		for(var i=0; i < buttons.length; i++) {
			if(toggle) { this.button[buttons[i]].show(); } else { this.button[buttons[i]].hide(); }
		}
	}
}


function main(metadata, orientation, panelHeight,  instance_id) {  
    return new WindowControlApplet(metadata, orientation, panelHeight, instance_id);
}
