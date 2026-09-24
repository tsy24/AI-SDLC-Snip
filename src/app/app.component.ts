import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LinkRecord, LinkService } from './link.service';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly linkService = inject(LinkService);

  readonly urlInput = signal('');
  readonly links = signal<LinkRecord[]>([]);
  readonly submitting = signal(false);
  readonly loadingLinks = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastCreated = signal<LinkRecord | null>(null);

  ngOnInit(): void {
    this.loadLinks();
  }

  loadLinks(): void {
    this.loadingLinks.set(true);
    this.linkService.getLinks().subscribe({
      next: (links) => {
        this.links.set(links);
        this.loadingLinks.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.extractError(err));
        this.loadingLinks.set(false);
      }
    });
  }

  submit(): void {
    const url = this.urlInput().trim();
    this.error.set(null);
    this.lastCreated.set(null);

    if (!URL_PATTERN.test(url)) {
      this.error.set('Please enter a valid http:// or https:// URL.');
      return;
    }

    this.submitting.set(true);
    this.linkService.createLink(url).subscribe({
      next: (link) => {
        this.lastCreated.set(link);
        this.urlInput.set('');
        this.submitting.set(false);
        this.loadLinks();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.extractError(err));
        this.submitting.set(false);
      }
    });
  }

  private extractError(err: HttpErrorResponse): string {
    if (err.error?.error) {
      return err.error.error;
    }
    if (err.status === 0) {
      return 'Unable to reach the server. Is it running at http://localhost:3000?';
    }
    return `Request failed (${err.status}).`;
  }
}
