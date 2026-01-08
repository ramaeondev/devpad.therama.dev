import { TestBed } from '@angular/core/testing';
import { PublicNoteComponent } from './public-note.component';

class MockShare { getShareByToken = jest.fn().mockResolvedValue({ share_token: 't', note_title: 'Title', permission: 'readonly', user_id: 'u1', content: 'hello' }); getShareContentForRefresh = jest.fn().mockResolvedValue({ content: 'hello' }); importPublicShare = jest.fn().mockResolvedValue({ note_id: 'n1' }); ensurePublicFolder = jest.fn().mockResolvedValue({ id: 'pub' }); }
class MockAuthState { isAuthenticated = jest.fn().mockReturnValue(false as any); userId = jest.fn().mockReturnValue(null); user = jest.fn().mockReturnValue(null); }
class MockSupabase { getSession = jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } }); }
class MockToast { success = jest.fn(); error = jest.fn(); info = jest.fn(); }
class MockRouter { navigate = jest.fn(); }

describe('PublicNoteComponent', () => {
  it('simpleMarkdownToHtml converts markdown to html', () => {
    const md = '# Hello\n**bold** *em*';
    const html = (PublicNoteComponent.prototype as any).simpleMarkdownToHtml(md);
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('canEdit/isOwner logic works', () => {
    const fakeThis: any = { share: () => ({ permission: 'editable', user_id: 'u1' }), isLoggedIn: () => true, authState: { userId: () => 'u1' } };
    expect(PublicNoteComponent.prototype.canEdit.call(fakeThis)).toBe(true);
    expect(PublicNoteComponent.prototype.isOwner.call(fakeThis)).toBe(true);
  });
});
