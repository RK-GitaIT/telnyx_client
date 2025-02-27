import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IvrcallComponent } from './ivrcall.component';

describe('IvrcallComponent', () => {
  let component: IvrcallComponent;
  let fixture: ComponentFixture<IvrcallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IvrcallComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IvrcallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
