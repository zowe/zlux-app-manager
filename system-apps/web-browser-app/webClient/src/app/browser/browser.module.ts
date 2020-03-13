import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserComponent } from './browser/browser.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddressBarComponent } from './address-bar/address-bar.component';
import { BrowserWindowComponent } from './browser-window/browser-window.component';
import { NavigationService } from './services/navigation.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [
    AddressBarComponent,
    BrowserComponent,
    BrowserWindowComponent,
  ],
  providers: [
    NavigationService,
  ],
  exports: [
    BrowserComponent
  ]
})
export class BrowserModule { }
