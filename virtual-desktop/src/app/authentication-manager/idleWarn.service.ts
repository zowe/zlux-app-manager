import moment from 'moment';
import { Injectable } from '@angular/core';
import { ZluxPopupManagerService, ZluxErrorSeverity } from '@zlux/widgets';
import { L10nTranslationService } from 'angular-l10n';
import { BaseLogger } from 'virtual-desktop-logger';
import { Subscription } from 'rxjs';
import { StorageService } from './storage.service';

@Injectable()
export class IdleWarnService {

  private report: any;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  
  constructor(private popupManager: ZluxPopupManagerService,
    public translation: L10nTranslationService,
    private storageService: StorageService  
    ) {
  }
  
  public createRetryErrorReport(renewSession: any, isIdle: any) {
    this.removeErrorReport();
    this.report = this.popupManager.createErrorReport(
      ZluxErrorSeverity.WARNING,
      this.translation.translate('Session Renewal Error'),
      this.translation.translate('Session could not be renewed. Logout will occur unless renewed. Click here to retry.'), 
      {
        blocking: false,
        buttons: [this.translation.translate('Retry'), this.translation.translate('Dismiss')]
      }
    );

    this.report.subscription = new Subscription();
    this.onUserActionSubscribe(renewSession,'Retry');
    this.onActivitySubscribe(renewSession, isIdle);
  }
  
  onUserActionSubscribe(renewSession: any, action: string) {
    if(this.report) {
      this.report.subscription.add(this.report.subject.subscribe((buttonName:any)=> {
        if (buttonName == this.translation.translate(action)) {
          renewSession();
        }
      }));  
    }
  }

  public createContinueErrorReport(renewSession: any, isIdle: any, expirationInMS: number, desktopSize: any) {
    this.removeErrorReport();
    let popupStyle;

    /* According to the size of the desktop, we move the expiration prompt to align with the app bar */
    switch (desktopSize) {
      case 3: {
        popupStyle = {
          'margin-bottom': '70px',
          'margin-right': '-5px'
        };
        break;
      }
      case 1: {
        popupStyle = {
          'margin-bottom': '15px',
          'margin-right': '-10px'
        };
        break;
      }
      default: {
        popupStyle = {
          'margin-bottom': '35px',
          'margin-right': '-5px'
        };
        break;
      }
    }

    this.report = this.popupManager.createErrorReport(
      ZluxErrorSeverity.WARNING,
      this.translation.translate('Session Expiring Soon'),
      //TODO: Add translation
      //this.translation.translate('You will be logged out at ', { expirationInMS: moment().add(expirationInMS/1000, 'seconds').format('LT') }),
      this.translation.translate('You will be logged out at ' + moment().add(expirationInMS/1000, 'seconds').format('LT')),
      {
        blocking: false,
        buttons: [this.translation.translate('Continue session')],
        timestamp: false,
        theme: "dark",
        style: popupStyle,
        callToAction: true
      });

      this.report.subscription = new Subscription();
      this.onUserActionSubscribe(renewSession, 'Continue session');
      this.onActivitySubscribe(renewSession, isIdle);
  }


  onActivitySubscribe(renewSession: any, isIdle: any) {
    if(this.report) {
      this.report.subscription.add(this.storageService.lastActive.subscribe(()=> {
        if (!isIdle()) {
          this.logger.info('ZWED5047I', 'renew on activity'); /*this.logger.info('Near session expiration, but renewing session due to activity');*/
          renewSession();
          this.removeErrorReport();
        }
      }));
    }
  }

  removeErrorReport() {
    if (this.report) {
      this.popupManager.removeReport(this.report.id); 
      this.report.subscription.unsubscribe();
      this.report = undefined;
    }
  }

}