# Window Button Applet

The Window Button Applet provides themable window controls for the Cinnamon Desktop Environment.

A complete rewrite and rework of the predecessing applet was undertaken, which enables multiple instances across panels on multiple displays. At present, version 1.1.3 is compatible with Cinnamon 5.4 and later.
 
## Known Issues

**PREFACE**: These issues are most likely a result of implementation semantics, or regressions rather, with Cinnamon's Window Manager called Muffin (which is a fork of Mutter from GNOME). From the debugging which has been undertaken thus far, there doesn't appear to be a problem with the present applet code. Feel free to correct or challenge this assertion.

- Muffin introduces a regression on the focus event signal (notify::focus). Swapping focus between windows on independent displays with identical attributes will fail to trigger this event; which thereby results in this applet failing to reappear for additional instances handling identical, duplicate windows after a change of focus (e.g. a duplicate, maximised window being unminimised). A workaround is to arbitrarily trigger the focus event by inputting SUPER to trigger the user menu or clicking vacant space on the desktop. An alternate workaround involves changing the Window focus mode under Windows->Behaviour in System Settings to an option other than "Click".
- Applying a new theme CSS through the applet requires Cinnamon to be restarted. (Ctrl+Alt+ESC).
- Switching between TTYs will result in the applet no longer rendering in the panel. 
