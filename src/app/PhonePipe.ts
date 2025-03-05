import { Pipe } from "@angular/core";

@Pipe({
    name: "phone"
  })
  export class PhonePipe {
    transform(rawNum:string) {
      const countryCodeStr = rawNum.slice(0,2);
      const areaCodeStr = rawNum.slice(2,5);
      const midSectionStr = rawNum.slice(5,8);
      const lastSectionStr = rawNum.slice(8);
  
      return `${countryCodeStr} (${areaCodeStr})${midSectionStr}-${lastSectionStr}`;
    }
  }