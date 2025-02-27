import { TestBed } from '@angular/core/testing';

import { CalltelnyxService } from './calltelnyx.service';

describe('CalltelnyxService', () => {
  let service: CalltelnyxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalltelnyxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
