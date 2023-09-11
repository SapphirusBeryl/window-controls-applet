/* 	Window Controls Applet for the Cinnamon Desktop Environment
 * 	Copyright (C) 2017-2023  Xavier (sapphirus@azorium.net)
 *
 * 	This program is free software: you can redistribute it and/or modify
 * 	it under the terms of the GNU General Public License as published by
 * 	the Free Software Foundation, with only version 3 of the License.
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
const GLib = imports.gi.GLib;

const _WindowTracker = WindowTracker.get_default();
const WorkspaceManager = global.display.get_workspace_manager();

const INFO = 0;
const VERBOSE = 1;
const ERROR = 2;
const ALL = 3;

const MAXIMIZE = 'maximize';
const MINIMIZE = 'minimize';
const CLOSE = 'close';

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

	getOmittance() {
		return this.omittanceLevel;
	}

	setOmittance(level) {
		this.omittanceLevel = level;
	}
}


class ButtonEvent {
	constructor(wca, buttonType)  {
		this.wca = wca;
		this.logger = wca.logger;
		this.buttonType = buttonType;
	}
	
	eventHandler(actor, event) {
		let button = event.get_button();
		this.wca.logger.log(VERBOSE, "Button event triggered for "+button+" "+this.buttonType);
		if (button == 1) {
               		return this._buttonPress();	
            	 } else if(button == 3) {
            		this._applet_context_menu.toggle();
            		return true;
		}
           	return false;
	}

	_buttonPress() {		
		let activeWindow = this.wca.getActiveWindow();	
		let app = _WindowTracker.get_window_app(activeWindow);
		if(!activeWindow || !app) 
			return false;		
		switch(this.buttonType) {
			case MINIMIZE:
				activeWindow.minimize();
				this.loggger.log(VERBOSE, "Minimised Window: "+ activeWindow.get_title());
				return true;
			case MAXIMIZE:
				if (activeWindow.get_maximized()) activeWindow.unmaximize(3); else activeWindow.maximize(3);
				this.logger.log(VERBOSE, "Maximize Window toggle: "+ activeWindow.get_title());
				return true;
			case CLOSE:
				activeWindow.delete(global.get_current_time());	
				this.logger.log(VERBOSE, "Closed Window: "+activeWindow.get_title());
				return true;
		}	
		return false;
	}

}

class WindowControlApplet extends Applet.Applet {
	constructor(metadata, orientation, panelHeight,  instanceId) { 
		super(orientation, panelHeight,  instanceId);
		this.logger = new Logger(INFO, UUID);
		this.appletPath=metadata.path;
		this.instanceId = instanceId;
		this.monitorId = this.panel.monitorIndex;
		this.themePath = "";
		try {
			this._initialize_settings();
			this.logger.log(VERBOSE, "Intialised Settings!");
			this._initialize_events();
			this.logger.log(VERBOSE, "Intialised Events!");
			this._loadTheme();
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
		this.button = [];
		let buttons=this.button_layout.split(':');
     		for (let i = 0; i < buttons.length; i++) {
     			if(!this._checkButton(buttons[i]))
				continue;
			this._createButton(buttons[i]);
     		}
	}

	_initialize_settings() {
		this.settings = new Settings.AppletSettings(this, UUID, this.instanceId);
                this.settings.bindProperty(Settings.BindingDirection.IN,"button-layout","button_layout",this._bind_settings,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"button-theme","button_theme", this._bind_settings,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"only-maximized", "onlyMaximized", this._bind_settings,null);
                this.settings.bindProperty(Settings.BindingDirection.IN,"verbose-log", "verbose_logging", this._bind_logging,null);
		this._bind_logging();
	}

	_bind_logging() {
		let omittance = (this.verbose_logging ? ALL : INFO);
		this.logger.setOmittance(omittance); 
		this.logger.log(VERBOSE, "Debugging enabled.");
	}
	_bind_settings() {
		this.actor.destroy_all_children();
		this._initialize_buttons();
		this._windowChange();
    	}

        _on_panel_edit_mode_changed() {
                let reactive = !global.settings.get_boolean('panel-edit-mode');
                let b=this.button_layout.split(':');
                for (let i = 0; i < b.length; i++){
                        this.button[b[i]].reactive=reactive;
                }
        }

 	_getCssPath(theme) {
        	return this.appletPath + '/themes/'+theme+'/style.css';
    	}

	_loadTheme(){
		this.actor.set_style_class_name("window-buttons");
		let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
		let themePath = this._getCssPath(this.button_theme);
		if(!GLib.file_test(themePath, GLib.FileTest.EXISTS)) {
			this.logger.log(INFO, "Theme at "+themePath+" does not exist.");
			themePath = this._getCssPath("default");	
		}
		theme.load_stylesheet(themePath);
		this.themePath = themePath;
	}

	_createButton(type) {
		this.button[type] = new St.Button({ name: 'windowButton', style_class: type + ' window-button', reactive: true });
            	this.actor.add(this.button[type]);
        	let buttonEvent = new ButtonEvent(this, type);
		this.button[type].connect('button-press-event', Lang.bind(buttonEvent, buttonEvent.eventHandler));
		this.logger.log(VERBOSE, "Created "+type+" button!");
	}

	getActiveWindow() {
		this.logger.log(VERBOSE, "Event signal triggered");
		let workspace = WorkspaceManager.get_active_workspace();
		let windows = workspace.get_display().sort_windows_by_stacking(workspace.list_windows());
		for (var i = windows.length - 1; i >= 0; i--) {
			let w = windows[i];
			if(((!(w.get_maximized() === Meta.MaximizeFlags.BOTH) 
						|| (w.get_window_type() == Meta.WindowType.DESKTOP) 
						|| w.minimized) && this.onlyMaximized)
						|| w.get_monitor() != this.monitorId)
				continue;
			return w;	
			
		}
		this.logger.log(VERBOSE, "Active window not found.");
		return false;                      
	}

	_windowChange() {
	    	if(!this.onlyMaximized)
			return;
		this._toggleButtons(this.getActiveWindow() != false);
	} 

	_toggleButtons(toggle) {
		let buttons=this.button_layout.split(':');
		for(var i = 0; i < buttons.length; i++)
			if(toggle) this.button[buttons[i]].show(); else this.button[buttons[i]].hide(); 
	}

	_checkButton(obj) {
		return obj == MAXIMIZE || obj == MINIMIZE || obj == CLOSE;
	}
}


function main(metadata, orientation, panelHeight,  instanceId) {  
    return new WindowControlApplet(metadata, orientation, panelHeight, instanceId);
}
