import { TestBed } from '@angular/core/testing';
import { OneDriveCallbackComponent } from './onedrive-callback.component';

describe('OneDriveCallbackComponent', () => {
  it('posts message to opener with access token and closes window', () => {
    const hash = '#access_token=abc123&expires_in=3600';
    const originalHash = window.location.hash;
    const originalOpener = (window as any).opener;
    const mockOpener = { postMessage: jest.fn() } as any;
    (window as any).opener = mockOpener;
    (window as any).location.hash = hash;

    // spy on window.close
    const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});

    const fixture = TestBed.createComponent(OneDriveCallbackComponent);
    const comp = fixture.componentInstance;

    comp.ngOnInit();

    expect(mockOpener.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'abc123' }),
      window.location.origin,
    );
    expect(closeSpy).toHaveBeenCalled();

    // cleanup
    (window as any).opener = originalOpener;
    (window as any).location.hash = originalHash;
    closeSpy.mockRestore();
  });
});
