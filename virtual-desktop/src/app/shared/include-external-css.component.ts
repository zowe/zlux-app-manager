import { Component, ViewEncapsulation } from "@angular/core";

@Component({
  standalone: true,
  selector: 'include-external-css',
  template: ``,
  styleUrls: [
    "../../../node_modules/typeface-roboto/index.css",
    "../../../node_modules/bootstrap/dist/css/bootstrap.min.css",
    "../../../node_modules/font-awesome/css/font-awesome.css",
    "../../assets/css/desktop.css",
    "../../assets/css/animate.css",
    "../../styles.css"
  ],
  encapsulation: ViewEncapsulation.None
})
export class IncludeExternalCssComponent {
  // No index.html files as prod level to import the css
  // ViewEncapsulation.None will make sure to keep the css as it is. Will not scoped out
  // Mentioned in the component so will be a part of main.js
}