declare module 'exceljs' {
  export class Workbook {
    worksheets: any[];
    addWorksheet(name: string): any;
    xlsx: {
      writeBuffer(): Promise<ArrayBuffer>;
      load(buffer: ArrayBuffer): Promise<void>;
    };
  }
}

declare module 'nepali-date-library' {
  export const NepaliDate: any;
  export const MONTH_EN: string[];
  export const MONTH_NP: string[];
  const defaultExport: any;
  export default defaultExport;
}
