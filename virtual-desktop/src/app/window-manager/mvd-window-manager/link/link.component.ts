import { Component, Input } from '@angular/core';
import { LinkDefinitionImpl } from '../../../plugin-manager/shared/link-definition';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../shared/window-manager.service';
import { DesktopTheme } from "../desktop/desktop.component";

@Component({
  selector: 'org-zowe-zlux-link',
  templateUrl: 'link.component.html',
  styleUrls: ['link.component.css', '../launchbar/launchbar-icon/launchbar-icon.component.css', '../launchbar/shared/shared.css']
})


export class LinkComponent {
  private _link:LinkDefinitionImpl;
  public name: string = "";
  public icon: string;
  public iconSize: string;
  public margin: string;
  public parentHeight: string;
  public parentWidth: string;
  
  @Input()
  set link(linkIn: LinkDefinitionImpl) {
    this._link=linkIn;
    this.name = linkIn.getName();
    this.icon = `url(${linkIn.image})`;
    console.log('icon=',this.icon);
  }
  get link(): LinkDefinitionImpl {
    return this._link;
  }

  public _theme:DesktopTheme;
  @Input() set theme(newTheme: DesktopTheme) {
    switch (newTheme.size.launchbar) {
    //no case2 here, too small
    case 3:
      this.iconSize="64px";
      this.parentHeight="112px";
      this.parentWidth="112px";
      break;
    default:
      this.iconSize="32px";
      this.parentHeight="96px";
      this.parentWidth="76px";
    }
  }
//  private applicationManager: MVDHosting.ApplicationManagerInterface;
//  private pluginManager: MVDHosting.PluginManagerInterface;
  
  constructor(
//    private injector: Injector,
    private windowManager: WindowManagerService,
  ){
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
//    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
//  this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
//    this.applicationManager.spawnApplication()
  }

  public openLink(): void {
    console.log(`Im clicked! I have link=${this.link.getKey()}`);
    let action = ZoweZLUX.dispatcher.getAbstractActionById(this.link.getAction());
    if (!action) {
      console.warn('Could not find link action. Possible action bug. Spawning app with context=data directly');
      action = ZoweZLUX.dispatcher.getAbstractActionById('org.zowe.zlux.link.'+this.link.getIdentifier());
      if (!action) {
        const genericFormatter = {data: {op:'deref',source:'event',path:['data']}};
        action = ZoweZLUX.dispatcher.makeAction('org.zowe.zlux.generic.create', 'Generic action', ZoweZLUX.dispatcher.constants.ActionTargetMode.PluginCreate, ZoweZLUX.dispatcher.constants.ActionType.Launch, this.link.getIdentifier(), genericFormatter);
        ZoweZLUX.dispatcher.registerAction((action as ZLUX.Action));
      }
    }
    ZoweZLUX.dispatcher.invokeAction((action as ZLUX.Action), this.link.getContext());
  }

  private remove() {}
  private rename() {}
  private openInNewBrowserTab() {}

  public showOptions($event:any): void {
    let menuItems: ContextMenuItem[] = [
      {'text': 'Open', 'action': ()=>{this.openLink()}},
      {'text': 'Remove', 'action': ()=>{this.remove()}},
      {'text': 'Rename', 'action': ()=>{this.rename()}},
      {'text': 'Open in new browser tab', 'action': ()=>{this.openInNewBrowserTab()}}
    ]
    $event.preventDefault();
    this.windowManager.contextMenuRequested.next({xPos:0, yPos:0, items: menuItems});
  }
}
