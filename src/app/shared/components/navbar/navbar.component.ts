import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isMenuOpen = false;
  unreadCount = 0;

  constructor(public auth: AuthService, private router: Router, private notifService: NotificationService) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn() && this.auth.isPassenger()) {
      this.loadUnreadCount();
    }
  }

  loadUnreadCount(): void {
    this.notifService.getUnreadCount(this.auth.getUserId()).subscribe({
      next: count => this.unreadCount = count,
      error: () => {}
    });
  }

  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
  closeMenu(): void { this.isMenuOpen = false; }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
  }

  get displayName(): string {
    const fullName = this.auth.getFullName().trim();
    const roleLabel = this.roleLabel.toLowerCase();

    if (fullName && fullName.toLowerCase() !== roleLabel) {
      return fullName;
    }

    const emailPrefix = this.auth.getEmail().split('@')[0]?.trim() || '';
    if (!emailPrefix) {
      return this.roleLabel;
    }

    return emailPrefix
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  get roleLabel(): string {
    const role = this.auth.getRole();
    if (role === 'AIRLINE_STAFF') return 'Airline Staff';
    if (role === 'ADMIN') return 'Administrator';
    if (role === 'PASSENGER') return 'Passenger';
    return 'Member';
  }

  get userInitials(): string {
    const parts = this.displayName.split(/\s+/).filter(Boolean).slice(0, 2);
    if (!parts.length) return 'SB';
    return parts.map(part => part.charAt(0).toUpperCase()).join('');
  }

  get dashboardRoute(): string {
    if (this.auth.isPassenger()) return '/passenger/dashboard';
    if (this.auth.isStaff()) return '/staff/dashboard';
    if (this.auth.isAdmin()) return '/admin/dashboard';
    return '/';
  }
}
