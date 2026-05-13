import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private router: Router) {}

  get isAuthRoute(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/login' || path === '/register' || path === '/oauth-success' || path === '/oauth2/redirect';
  }
}
