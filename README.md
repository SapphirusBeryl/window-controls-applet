# Window Button Applet #

The Window Button Applet provides themable window controls for the Cinnamon Desktop Environment. Multi-instance support enables multi-monitor support, as well as support for multiple workspaces.

A complete rewrite and rework of the predecessing applet was undertaken, which enables multiple instances across panels on multiple displays. Present version 1.20 is compatible with Cinnamon 5 (including 5.4) and later.  

## KNOWN ISSUES ## 

**PREFACE:** These issues are a result of implementation semantics or regressions with Cinnamon's Window Manager called Muffin (which is a fork of Mutter from the Gnome Desktop). From the debugging which has been done so far, there doesn't appear to be a problem with the present applet code. 

- Muffin introduces a regression on the focus event signal (notify::focus). Swapping focus between windows with identical attributes will fail to trigger this event; which thusly results in this applet failing to reappear for additional instances handling identical, duplicate windows after a change of focus (e.g. a duplicate, maximised window being unminimised). Workaround is clicking the desktop on another display or inputting SUPER to trigger the user menu. 
- Applying a new theme CSS through the applet requires the window manager to be reloaded (ctrl+alt+`).

