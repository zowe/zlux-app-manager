import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-address-bar',
  templateUrl: './address-bar.component.html',
  styleUrls: ['./address-bar.component.css']
})
export class AddressBarComponent implements OnInit {

  url = new FormControl('');
  placeholder = 'URL';

  constructor(
    private navigation: NavigationService,
  ) { }

  ngOnInit() {
  }

  navigate(): void {
    if (this.url.value) {
      this.navigation.navigate(
        this.addSchemeIfNeeded(this.url.value)
      );
    }
  }

  private addSchemeIfNeeded(url: string): string {
    if (!url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

}
