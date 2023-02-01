import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from "@angular/core";
import {FormArray, FormBuilder, FormGroup} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControlService} from "../../services/form-control.service";
import {Section, Field, Model, Tabs} from "../../domain/dynamic-form-model";
import {
  Columns,
  Content,
  DocDefinition,
  PdfImage,
  PdfMetadata,
  PdfTable,
  PdfUnorderedList,
  TableDefinition
} from "../../domain/PDFclasses";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import BitSet from "bitset";

pdfMake.vfs = pdfFonts.pdfMake.vfs;
import UIkit from "uikit";

@Component({
  selector: 'app-survey',
  templateUrl: 'survey.component.html',
  providers: [FormControlService]
})

export class SurveyComponent implements OnInit, OnChanges {

  @Input() answer: any = null; // cant import specific project class in lib file
  @Input() model: Model = null;
  @Input() vocabulariesMap: Map<string, object[]> = null;
  @Input() subVocabularies: Map<string, object[]> = null;
  @Input() tabsHeader: string = null;
  @Input() mandatoryFieldsText: string = null;
  @Input() downloadPDF: boolean = false;
  @Output() valid = new EventEmitter<boolean>();
  @Output() submit = new EventEmitter<[FormGroup, boolean]>();

  sectionIndex = 0;
  chapterChangeMap: Map<string,boolean> = new Map<string, boolean>();
  currentChapter: Section = null;
  chapterForSubmission: Section = null;
  sortedSurveyAnswers: Object = {};
  editMode: boolean = false;
  bitset: Tabs = new Tabs;

  ready = false;
  readonly : boolean = false;
  validate : boolean = false;
  errorMessage = '';
  successMessage = '';

  form: FormGroup;

  constructor(private formControlService: FormControlService, private fb: FormBuilder, private router: Router,
              private route: ActivatedRoute) {
    this.form = this.fb.group({});
  }

  ngOnInit() {
    if (this.router.url.includes('/view')) {
      this.readonly = true;
    } else if (this.router.url.includes('/validate')) {
      this.validate = true;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    this.ready = false;
    if (this.answer)
      this.editMode = true;
    if (this.model) {
      this.currentChapter = this.model.sections[0];
      // this.formControlService.getUiVocabularies().subscribe(res => {
      //   this.vocabularies = res;
        this.model.sections = this.model.sections.sort((a, b) => a.order - b.order);
        for (const section of this.model.sections) {
          for (const surveyAnswer in this.answer?.answer) {
            if (section.id === this.answer.answer[surveyAnswer]?.chapterId) {
              this.chapterChangeMap.set(section.id, false);
              this.sortedSurveyAnswers[section.id] = this.answer.answer[surveyAnswer].answer;
              break;
            }
          }
        }
      // },
      // error => {
      //   this.errorMessage = 'Something went bad while getting the data for page initialization. ' + JSON.stringify(error.error.error);
      // },
      // () => {
        for (let i = 0; i < this.model.sections.length; i++) {
          if (this.model.sections[i].subSections === null) {
            this.form.addControl(this.model.name, this.formControlService.toFormGroup(this.model.sections, true));
            break;
          }
          this.form.addControl(this.model.sections[i].name, this.formControlService.toFormGroup(this.model.sections[i].subSections, true));
          if (this.answer) {
            this.prepareForm(this.answer.answer, this.model.sections[i].subSections)
            this.form.patchValue(this.answer.answer);
            this.form.markAllAsTouched();
          }
        }
        if (this.answer?.validated) {
          this.readonly = true;
          this.validate = false;
        } else if (this.validate) {
          UIkit.modal('#validation-modal').show();
        }

        setTimeout(() => {
          if (this.readonly) {
            this.form.disable();
          }
        }, 0);
        this.ready = true;
      // });
    }
    // else { // TODO: remove later
    //   this.route.params.subscribe(
    //     params => {
    //       zip(
    //         this.formControlService.getUiVocabularies(),
    //         this.formControlService.getFormModelByType(params['resourceTypeModel'])
    //       ).subscribe(
    //         res => {
    //           this.vocabularies = res[0];
    //           this.model = res[1].results[0];
    //         },
    //         error => {console.log(error)},
    //         () => {
    //           for (let i = 0; i < this.model.sections.length; i++) {
    //             if (this.model.sections[i].subSections)
    //               this.form.addControl(this.model.sections[i].name, this.formControlService.toFormGroup(this.model.sections[i].subSections, true));
    //             else {
    //               this.form.addControl(this.model.name, this.formControlService.toFormGroup(this.model.sections, true));
    //             }
    //             // this.prepareForm(this.sortedSurveyAnswers[Object.keys(this.sortedSurveyAnswers)[i]], this.surveyModel.sections[i].subSections)
    //             // this.form.get(this.surveyModel.sections[i].name).patchValue(this.sortedSurveyAnswers[Object.keys(this.sortedSurveyAnswers)[i]]);
    //           }
    //           // if (this.surveyAnswers.validated) {
    //           //   this.readonly = true;
    //           //   this.validate = false;
    //           // } else if (this.validate) {
    //           //   UIkit.modal('#validation-modal').show();
    //           // }
    //
    //           // setTimeout(() => {
    //           //   if (this.readonly) {
    //           //     this.form.disable();
    //           //   }
    //           // }, 0);
    //           this.ready = true
    //         }
    //       );
    //     }
    //   );
    // }
  }

  validateForm() {
    for (const chapterChangeMapElement of this.chapterChangeMap) {
      if (chapterChangeMapElement[1]) {
        UIkit.modal('#validation-modal').hide();
        this.errorMessage = 'There are unsaved changes, please submit all changes first and then validate.';
        return;
      }
    }
    if (this.form.valid) {
      this.valid.emit(this.form.valid);
    } else {
      UIkit.modal('#validation-modal').hide();
      console.log('Invalid form');
      this.form.markAllAsTouched();
      let str = '';
      for (let key in this.form.value) {
        // console.log(this.form.get('extras.'+key));
        console.log(key + ': '+ this.form.get(key).valid);
        if (!this.form.get(key).valid) {
          str =  str + '\n\t-> ' + key;
        }
        for (const keyElement in this.form.get(key).value) {
          console.log(keyElement + ': '+ this.form.get(key+'.'+keyElement).valid);
        }
      }
      this.errorMessage = 'There are missing fields at chapters ' + str;
    }
  }

  parentSubmit() {
    this.submit.emit([this.form, this.editMode]);
  }

  onSubmit() { // FIXME
    window.scrollTo(0, 0);
    // this.showLoader = true;
    // this.formControlService.postItem(this.surveyAnswers.id, this.form.get(this.chapterForSubmission.name).value, this.editMode).subscribe(
    let postMethod = '';
    let firstParam = '';
    if (this.answer?.id) {
      postMethod = 'postItem';
      firstParam = this.answer.id;
    } else {
      postMethod = 'postGenericItem'
      firstParam = this.model.resourceType;
    }
    console.log(postMethod)
    console.log(firstParam);
    this.formControlService[postMethod](firstParam, this.form.value, this.editMode).subscribe(
      res => {
        this.successMessage = 'Updated successfully!';
        for (const key of this.chapterChangeMap.keys()) {
          this.chapterChangeMap.set(key, false);
        }
        UIkit.modal('#unsaved-changes-modal').hide();
      },
      error => {
        this.errorMessage = 'Something went bad, server responded: ' + JSON.stringify(error?.error?.message);
        UIkit.modal('#unsaved-changes-modal').hide();
        // this.showLoader = false;
        // console.log(error);
      },
      () => {
        this.closeSuccessAlert();
        // this.showLoader = false;
      }
    );
  }

  showUnsavedChangesPrompt(chapter: Section) {
    if (this.chapterChangeMap.get(this.currentChapter.id)) {
      this.chapterForSubmission = this.currentChapter;
      UIkit.modal('#unsaved-changes-modal').show();
    }
    this.currentChapter = chapter;
  }

  getFormGroup(sectionIndex: number): FormGroup {
    if (this.model.sections[sectionIndex].subSections === null) {
      return this.form.get(this.model.name) as FormGroup;
    } else
      // console.log(this.form.get(this.survey.sections[sectionIndex].name));
      return this.form.get(this.model.sections[sectionIndex].name) as FormGroup;
  }

  setChapterChangesMap(chapterId: string[]) {
    if (chapterId[1] === null) {
      this.chapterChangeMap.set(chapterId[0], true);
    } else {
      this.chapterChangeMap.set(chapterId[0], false);
    }
  }

  /** create additional fields for arrays if needed --> **/
  prepareForm(answer: Object, fields: Section[], arrayIndex?: number) { // I don't think it will work with greater depth than 2 of array nesting
    for (const [key, value] of Object.entries(answer)) {
      // console.log(`${key}: ${value}`);
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        this.prepareForm(value, fields);
      } else if (Array.isArray(value)) {
        if (value?.length > 1) {
          this.pushToFormArray(key, value.length, arrayIndex);
        }
        for (let i = 0 ;i < value?.length; i++) {
          if (typeof value[i] === 'object' && !Array.isArray(value[i]) && value !== null) {
            this.prepareForm(value[i], fields, i);
          }
          // Maybe a check for array in array should be here
        }
      } else if (value === null) {
        // console.log(key+ ' is null');
      }
    }
  }

  pushToFormArray(name: string, length: number, arrayIndex?: number) {
    let field = this.getModelData(this.model.sections, name);
    for (let i = 0; i < length-1; i++) {
      this.getFormControl(this.form, name, arrayIndex).push(this.formControlService.createField(field));
    }
  }

  getModelData(model: Section[], name: string): Field {
    let field = null;
    for (let i = 0; i < model.length; i++) {
      if (model[i].fields === null) {
        field = this.getModelData(model[i].subSections, name);
        if (field) {
          return field;
        }
      } else {
        field = this.searchSubFields(model[i].fields, name);
        if (field) {
          return field;
        }
      }
    }
    return field;
  }

  searchSubFields(fields: Field[], name): Field | null {
    let field = null;
    for (let j = 0; j < fields.length; j++) {
      if(fields[j].name === name) {
        return fields[j];
      } else if (fields[j].subFields?.length > 0) {
        field = this.searchSubFields(fields[j].subFields, name);
        if (field?.name === name)
          return field;
      }
    }
    return null;
  }

  getFormControl(group: FormGroup | FormArray, name: string, position?: number): FormArray {
    let abstractControl = null;
    for (const key in group.controls) {
      abstractControl = group.controls[key];
      if (abstractControl instanceof FormGroup || abstractControl instanceof FormArray) {
        if (key === name) {
          return abstractControl as FormArray;
        } else if (key !== name) {
          if (abstractControl instanceof FormArray) {
            if (abstractControl.value.length > position) {
              abstractControl = this.getFormControl(abstractControl.controls[position] as FormGroup | FormArray, name, position);
              if (abstractControl !== null)
                return abstractControl;
            }
          } else {
            abstractControl = this.getFormControl(abstractControl, name, position);
            if (abstractControl !== null)
              return abstractControl;
          }
        }
      } else {
        if (key === name) {
          return abstractControl;
        }
        abstractControl = null;
      }
    }
    return abstractControl;
  }
  /** <-- create additional fields for arrays if needed **/

  /** Generate PDF --> **/
  generatePDF() {
    let docDefinition: DocDefinition = new DocDefinition();
    // docDefinition.header.text = 'Header Text'
    // docDefinition.header.style = ['sectionHeader']
    docDefinition.content.push(new Content(this.model.name, ['title']));
    docDefinition.info = new PdfMetadata(this.model.name);
    docDefinition.defaultStyle = {
      font: 'Roboto',
      fontSize: 12,
      color: 'black',
    }
    docDefinition.styles = {
      title: {
        bold: true,
        alignment: 'center',
        fontSize: 24,
        margin: [0, 15, 0, 10]
      },
      chapterHeader: {
        bold: true,
        fontSize: 18,
        alignment: 'center',
        margin: [0, 30, 0, 10]
      },
      tabHeader: {
        bold: true,
        fontSize: 15,
        alignment: 'center',
        decoration: 'underline',
        margin: [0, 20, 0, 15]
      },
      link: {
        color: 'blue',
      },
      mt_1: {
        margin: [0, 2, 0, 0]
      },
      mt_3: {
        margin: [0, 8, 0, 0]
      },
      mt_5: {
        margin: [0, 25, 0, 0]
      },
      mx_1: {
        margin: [0, 2, 0, 2]
      },
      mx_3: {
        margin: [0, 8, 0, 8]
      },
      ms_1: {
        margin: [3, 0, 0, 0]
      },
      ms_5: {
        margin: [20, 0, 0, 0]
      },
      marginTopCheckBox: {
        margin: [0, 3, 0, 0]
      }
    }
    docDefinition.images = {
      radioChecked: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAD/klEQVRoQ+2Zj3HVMAzG2wmACUgnoExAmAA6AY8JgAkIEwATkE4ATECYgDIB6QTABKBfse5UP9uy8/7AO6o73UtiW9b3SZadvOOjA5fjA/f/6AbA347gNiNwKmAeifait0W5t3IhNz9Ep6CftwF+UwA4+kx0Jdo1OjRL/w+irwKwxuF/ui8FoI4/D2wvmjwMIipvRN8uAbIEwGOZ6HWC8Z+BUVIEdlXxk+igAGc8eitCDZCnwUY1Ia0AXorlIbJOLvMMx1ukD+MeRIOwRVpVSS0AmIP1lbF6Ge5bHY8dAwgpdM80jHL9QpSoFKUWwLvI+XO5J//dCTwHQjsEAeJJBIKU2hjAIBZIHRXCy7NdSPNcXgRYbO/35LxOE4M4kwbKbVJKAAjrN1F+EdJmtQvaEzZHeabpRJqeiCbTtQTAMvFVDPQ5IxlQcXVp2XkhbRLVhZ1N2xyAmP2HwaAXgE46sF5IPY2cjoFB3Xlnz1Ag7FPol41CDgAVgSMCAnOw70lqj8iNGaShptYTBY0kOzWV75rkAJD7XehZw35cZj2wtI+iXpmEOI3CLNesBReAHcTxIE6F2IaNVo3jtk9NSSZ99NixRmYqAoRX675XeYgS0dpEYBV2c0KktCKtAU4BmGSA5l2xBks/a3wpCI8kuxetrccUgC/iyWnwxsv/7xUp5gEjRe4UOvXSpuvgQq7v274pAL9Mh1J4rWHPSa+9RBRkQqrKNZ89AKWNbl8AcNyS+n8BOMgUYqHoGcRbxLZGe3mea/f2GpuqnMm0wFzZ88ooO+VY8Iw2+xKyBIRXRldilJ0e+ShKWU2v6PB0kN9/dSPjNZOdvwjAli2vRmPIAm6NQM1Rwu417AGkeBEAjbPo3dDLWwd0G0VbU8lLHez2orqJXcp1FzOUq/OW1UkGAcKTlkjUMM98OA8IJDkmB4ATKFHIngIzaGAIICy0+MOVfviiHdue4Liyz1hsr71WlnZayygTkn/J99KMJ8qcNk+ex6YdAjk+4DSSjVgJAEZYMLoWeB3kdLoP4UuIlktyn8KSJK8EAEftUZb75GvdlhENYs9+h1r8WUX94j2Uz4oq1GHq8S4kfq9eq/vxpF4EtP8oF7ZMkk7s0i1rogSYdGW3tbtsTZmt/n+ACWDegphDJACzifTB+c4YwXki7xJUGwG1HacTz6cAjnNKi+A4KcOvldo94mpMKwDGEGaiodVJJ4ctogGgWZTards+VYR9oQsOY4OoWqH/KtiImvK3SwBgjcmJBhpvWNWTh444DiGomzKx8aUA1I4Cgbk4Ih4Q6jsRG5Y4rsY3BWCdJE1IDX47UfuPC/14GYHhyagH0m3fJgB3sl10uAGwC1ZbbB58BH4DHK/eMUOdTWMAAAAASUVORK5CYII=',
      radioUnchecked: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADeUlEQVRoQ+2Zi5HUMAyG7yoAKmCpgKMCQgVABYQKgAoIFQAVsFQAVECogKMCchUAFYA+sGZ0jh3b2SS+HU4zmmwSW9avl+Xs6cmR0+mR639yDaC2B5f0wJmAeSjcCN8U5t7Sudz8FO4df1kC/KEAUPSZcCu8K1RokPEfhV85YIXT/w2fC0AVf+6sPWtxNwmvvBF+OwfIHACPZKHXAYv/chYlRLCuMnriHRjgzIdveKgB8tTJyDZIKYCXIrnzpBPLPEPxEmrcvPveJGQRVlmUCwDLYfXWSL1w96WK+4oBhBC6a17s5fcLYbwySbkA3nnKv5d74j+5QEoB9x4DAeKJB4KQOhhAJxIIHSXcy7M1qHitlAdItg8bKa/L+CAeywvKbZCmAODW78JcIcKmXcPsAZl7eabhRJjeEQ6G6xQAa4lvIqCJCVkBFEbrhTWxo2EbA+Bb/4ETuIKuUZEY7LN7G/VCDAAVgRYBos4jrAbhBd0n2KmpfJcoBoDY37mRNayvSlovDPKQXEgCsJNoDzSJa3iANQkfbTtGxgx5oJMJWve3rDwxA+3lhVakUTKHANi4m6zBG7nE7kWjfAwB+CqKnV2B+A/lwbk8vGcNFwLw2wwgaUiemoQxMarSJZ1TAFKtxlbArFH/LwBHGUIkivYgNTexUBLTk2mB+fs+VUY5UFCHa1Iri3Oggj4JU1bDGe2ednK9qhsZx0z6tEkAtmyxjd+qaX5Z+4ewtjPsAYT4JABeDsK33aiaedCIDtpSX8jvnW/MWJ23YdTLJEDUIJQHBBQ81EwdaPBCtAvcAI21Pl0x1h8dK6d2WusFwBB/S31GSeEn5mkfNGSC1kfIFACEkDCaC3wZoDvdgvgSouWS2KewFB/qUdS2stwHj3ULI7KeR/TszyqqF+dQPisqUYepx2uQ/+11VPf9RXO7zb1MtJ/9CCd26aVygnBlt7W7bNZpMBcAC2B5C2JwngDMIdQ45XdGCMrj+aSBcgHEwonnvQNHn1JCKE7IcLUUrTgh4aUAkIGb8YZWJ5WLtfAGgAZhardu+1QR9pSdUxgZ2h7ofMa3Tka2IeYAQDiL42LY/6cle3E3EMUxCJwMGV/4XAAqR4FgOd8jKSDUdzzWzVFchR8KwCpJmBAaXAkV+48L4ziMYOHecApk8v2SAJKLrTHgGsAaVi2RefQe+APW/7QxCYAvyQAAAABJRU5ErkJggg==',
      checked: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAQAAACROWYpAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAF+2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDAgNzkuMTYwNDUxLCAyMDE3LzA1LzA2LTAxOjA4OjIxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMTktMTItMzBUMDE6Mzc6MjArMDE6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE5LTEyLTMwVDAxOjM4OjI4KzAxOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE5LTEyLTMwVDAxOjM4OjI4KzAxOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMSIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9IkRvdCBHYWluIDIwJSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowNzVjYjZmMy1jNGIxLTRiZjctYWMyOS03YzUxMWY5MWJjYzQiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo5ZTM1YTc3ZC0zNDM0LTI5NGQtYmEwOC1iY2I5MjYyMjBiOGIiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowYzc2MDY3Ny0xNDcwLTRlZDUtOGU4ZS1kNTdjODJlZDk1Y2UiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjBjNzYwNjc3LTE0NzAtNGVkNS04ZThlLWQ1N2M4MmVkOTVjZSIgc3RFdnQ6d2hlbj0iMjAxOS0xMi0zMFQwMTozNzoyMCswMTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjA3NWNiNmYzLWM0YjEtNGJmNy1hYzI5LTdjNTExZjkxYmNjNCIgc3RFdnQ6d2hlbj0iMjAxOS0xMi0zMFQwMTozODoyOCswMTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+jHsR7AAAAUNJREFUOMvN1T9Lw0AYx/EviLVFxFH8M3USgyAFoUsQ0UV8F6Ui4qCTbuJg34HgptBdUATrUoxiqYMgiOBoIcW9BVED+jgkntGm9i6CmN+Sg/vAcc89dwBd5Clzj6uZGg7LJAC62UFipEgKcmroaeZj/gpcIAhl5rE1M0cJQbiCOsIrs5h8WZ4R6j72yBrhcRo+dhE8bCOcoYng/hFOMxAXb/DAHTNxcCGo7JE5LqhjsW2KP6nDcGecCv1vRdC2eJQDLllooach2hbvIghvLJJgM0QHdeq8F0x/5ETRM4b0DonF7be+Pf+y4A4bZnETok4E/XG3xxR3WhasUWeLCg2OGYnXGP1MkPwnLRmJf3UN+RfgtBGe5MnHVQShxBQZzdgcIgjXsKSu/KZmXgKxBkmKsZ6bffoAelilQs3goauyTi+8A8mhgeQlxdNWAAAAAElFTkSuQmCC',
      unchecked: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAQAAACROWYpAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAF+2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDAgNzkuMTYwNDUxLCAyMDE3LzA1LzA2LTAxOjA4OjIxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMTktMTItMzBUMDE6Mzc6MjArMDE6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE5LTEyLTMwVDAxOjM4OjU3KzAxOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE5LTEyLTMwVDAxOjM4OjU3KzAxOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMSIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9IkRvdCBHYWluIDIwJSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpjMGUyMmJhZC1lY2VkLTQzZWUtYjIzZC1jNDZjOTNiM2UzNWMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo5M2FhOTEzYy1hZDVmLWZmNGEtOWE5Ny1kMmUwZjdmYzFlYmUiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozYmY2ODFlMy1hMTRhLTQyODMtOGIxNi0zNjQ4M2E2YmZlNjYiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjNiZjY4MWUzLWExNGEtNDI4My04YjE2LTM2NDgzYTZiZmU2NiIgc3RFdnQ6d2hlbj0iMjAxOS0xMi0zMFQwMTozNzoyMCswMTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmMwZTIyYmFkLWVjZWQtNDNlZS1iMjNkLWM0NmM5M2IzZTM1YyIgc3RFdnQ6d2hlbj0iMjAxOS0xMi0zMFQwMTozODo1NyswMTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+6AB6cQAAAPxJREFUOMvF1b1Kw1AYBuAnFf8QL8WlIHQJIriIdyEu4qCTXop7dwenTgUHpYvgJVhob8AuakE+h9hapJqcFDXvFDgPIXlzvgNLjnQ9GlRM340TK7DsUtRI2zqH09txxUzWn3IrhK4DecXs6wjhnqHwZk/K1fIiDAs81krCW54KPBDG8iTcNBIGf4ND1MWTdmrgqIOL5TM0S8SRhmMu1dAo+2DZ57t9eWajtKrvN1GVnrMK9HewhbBy+nPPJbTsJwmymOn8P7fkfLzQGCoG4G4S3vZc4J4QOnY0KyZ3LYQHjqcjf1Qxrx/inDXtWsfNlU1YdeZOP+Gg67mwwTvIDqR1iAowgQAAAABJRU5ErkJggg==',
    }
    let description = 'none';
    if (this.model.name === 'Survey on National Contributions to EOSC 2022')
    {
      description = 'end'
    }
    this.createDocumentDefinition(this.form, docDefinition, description);

    pdfMake.createPdf(docDefinition).download(this.model.name);
  }

  documentDefinitionRecursion(fields: Field[], docDefinition: DocDefinition, description: string, descriptionAtEnd?: DocDefinition) {
    for (const field of fields) {
      if (field.label.text)
        docDefinition.content.push(new Content(field.label.text, ['mx_3']));
      if (field.form.description.text) {
        if (description === 'end') {
          let questionNumber = null;
          if (field.label.text) {
            questionNumber = field.label.text.split('. ')[0];
          }
          // let term = field.form.description.text.split('-')[0]
          let components = this.strip(field.form.description.text).split(' - ');
          let content = {
            style: ['mt_3'],
            text: [
              questionNumber,
              ' ',
              {text:  components.shift(), bold: true},
              ' - ',
              components.join('-')
            ]
          }
          // descriptionAtEnd.content.push(new Content(questionNumber + ' ' + components.shift() + '-' + components.join('-'), ['mt_3']));
          descriptionAtEnd.content.push(content);
        }
        if (description === 'show')
          docDefinition.content.push(new Content(field.form.description.text, ['mt_3']));
      }
      let answerValues = this.findVal(this.answer, field.name);
      if (field.typeInfo.type === 'radio') {
        let values = field.typeInfo.values
        // if (field.kind === 'conceal-reveal')
        //   values = this.getModelData(this.model.sections, field.parent).typeInfo.values;
        for (const value of values) {
          let content = new Columns();
          if (value === answerValues?.[0]){
            content.columns.push(new PdfImage('radioChecked', 10, 10, ['marginTopCheckBox']));
          }
          else {
            content.columns.push(new PdfImage('radioUnchecked', 10, 10, ['marginTopCheckBox']));
          }
          content.columns.push(new Content(value,['ms_1', 'mt_1']));
          docDefinition.content.push(content);
        }
      } else if (field.typeInfo.type === 'checkbox') {
        docDefinition.content.pop();
        let content = new Columns(['mx_1']);
        if (answerValues?.[0]) {
          content.columns.push(new PdfImage('checked', 10, 10, ['mt_1']));
        } else {
          content.columns.push(new PdfImage('unchecked', 10, 10, ['mt_1']));
        }
        content.columns.push(new Content(field.label.text,['ms_1']));
        docDefinition.content.push(content);
      } else if (field.typeInfo.type === 'largeText' || field.typeInfo.type === 'richText') {
        if (answerValues?.[0]) {
          docDefinition.content.push(new PdfTable(new TableDefinition([[answerValues[0]]], ['*']), ['mt_1']));
        } else {
          docDefinition.content.push(new PdfTable(new TableDefinition([['']],['*'], [48]), ['mt_1']));
        }
      } else if (field.typeInfo.type !== 'composite') {
        if (answerValues?.[0]) {
          docDefinition.content.push(new PdfTable(new TableDefinition([[answerValues[0]]], ['*']), ['mt_1']));
        } else {
          docDefinition.content.push(new PdfTable(new TableDefinition([['']],['*'], [16]), ['mt_1']));
        }
      }
      if (field.subFields)
        this.documentDefinitionRecursion(field.subFields, docDefinition, description, descriptionAtEnd);
    }
  }

  createDocumentDefinition(group: FormGroup | FormArray, docDefinition: DocDefinition, description: string) {
    let descriptionsAtEnd = new DocDefinition();
    this.model.sections.sort((a, b) => a.order - b.order);
    for (const section of this.model.sections) {
      section.subSections.sort((a, b) => a.order - b.order);
      if (this.model.sections.length > 1) {
        docDefinition.content.push(new Content(section.name, ['chapterHeader']));
      }

      for (const subSection of section.subSections) {
        if (section.subSections.length > 1) {
          docDefinition.content.push(new Content(subSection.name, ['tabHeader']));
        }
        if (subSection.fields)
          this.documentDefinitionRecursion(subSection.fields, docDefinition, description, descriptionsAtEnd);
      }

    }

    if (this.model.name === 'Survey on National Contributions to EOSC 2022') {

      docDefinition.content.push(new Content('Appendix A', ['title']));
      docDefinition.content.push(...descriptionsAtEnd.content);

      docDefinition.content.push(new Content('Appendix B', ['title']));
      let content = [
        {
          style: ['mt_3'],
          text: ['Visit the ',
            {text: 'EOSC Observatory', link: 'https://eoscobservatory.eosc-portal.eu', color: 'cornflowerblue', decoration: 'underline'},
            ' to explore the data from the first EOSC Steering Board survey on National Contributions to EOSC 2021 and visit the ',
            {text: 'EOSC Observatory Zenodo Community', link: 'https://zenodo.org/communities/eoscobservatory', color: 'cornflowerblue', decoration: 'underline'},
            ' to access all relevant documents for the surveys and EOSC Observatory']
        }
      ]
      docDefinition.content.push(content);
    }

    return;

    // for (const key in group.controls) {
    //   let abstractControl = group.controls[key];
    //   let field = this.getModelData(this.model.sections, key);
    //   if (abstractControl instanceof FormGroup) {
    //     if (field){
    //       if (field.kind === 'question')
    //         docDefinition.content.push(new Content(field.label.text,['mt_5']));
    //       else
    //         docDefinition.content.push(new Content(field.label.text,['mt_1']));
    //     }
    //     this.createDocumentDefinition(abstractControl, docDefinition);
    //   } else if (abstractControl instanceof FormArray) {
    //     if (field.kind === 'question')
    //       docDefinition.content.push(new Content(field.label.text,['mt_5']));
    //     else
    //       docDefinition.content.push(new Content(field.label.text,['mt_1']));
    //     let tmpArr = [];
    //     for (let i = 0; i < abstractControl.controls.length; i++) {
    //       let control = group.controls[key].controls[i];
    //       if (control instanceof FormGroup || control instanceof FormArray) {
    //         this.createDocumentDefinition(control, docDefinition);
    //       } else {
    //         tmpArr.push(control.value);
    //         // docDefinition.content.push(new Content(control.value,['mt_1']));
    //       }
    //     }
    //     if (tmpArr.length > 0) {
    //       let columns = new Columns();
    //       columns.columns.push(new Content('', [''], 15));
    //       columns.columns.push(new PdfUnorderedList(tmpArr,''));
    //       docDefinition.content.push(columns);
    //     }
    //   } else {
    //     let field = this.getModelData(this.model.sections, key);
    //     if (field.kind === 'question')
    //       docDefinition.content.push(new Content(field.label.text,['mt_5']));
    //     else
    //       docDefinition.content.push(new Content(field.label.text,['mt_1']));
    //     if (field.typeInfo.type === 'radio') {
    //       let values = field.typeInfo.values
    //       if (field.kind === 'conceal-reveal')
    //         values = this.getModelData(this.model.sections, field.parent).typeInfo.values;
    //       for (const value of values) {
    //         let content = new Columns();
    //         if (value === abstractControl.value){
    //           content.columns.push(new PdfImage('radioChecked', 10, 10, ['marginTopCheckBox']));
    //         }
    //         else {
    //           content.columns.push(new PdfImage('radioUnchecked', 10, 10, ['marginTopCheckBox']));
    //         }
    //         content.columns.push(new Content(value,['ms_1', 'mt_1']));
    //         docDefinition.content.push(content);
    //       }
    //     } else if (field.typeInfo.type === 'checkbox') {
    //       docDefinition.content.pop();
    //       let content = new Columns();
    //       if (abstractControl.value) {
    //         content.columns.push(new PdfImage('checked', 10, 10, ['marginTopCheckBox']));
    //       } else {
    //         content.columns.push(new PdfImage('unchecked', 10, 10, ['marginTopCheckBox']));
    //       }
    //       content.columns.push(new Content(field.label.text,['ms_1', 'mt_1']));
    //       docDefinition.content.push(content);
    //     } else {
    //       if (abstractControl.value){
    //         docDefinition.content.push(new PdfTable(new TableDefinition([[abstractControl.value]], ['*']), ['mt_1']));
    //       } else {
    //         docDefinition.content.push(new PdfTable(new TableDefinition([['']],['*'], [16]), ['mt_1']));
    //       }
    //     }
    //   }
    //
    // }
  }

  findVal(obj, key) {
    let seen = new Set, active = [obj];
    while (active.length) {
      let new_active = [], found = [];
      for (let i=0; i<active.length; i++) {
        Object.keys(active[i]).forEach(function(k){
          let x = active[i][k];
          if (k === key) {
            found.push(x);
          } else if (x && typeof x === "object" &&
            !seen.has(x)) {
            seen.add(x);
            new_active.push(x);
          }
        });
      }
      if (found.length) return found;
      active = new_active;
    }
    return null;
  }

  strip(html){
    let doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }

  /** <-- Generate PDF **/

  /** other stuff --> **/
  closeError() {
    UIkit.alert('#errorAlert').close();
    setTimeout(() => {
      this.errorMessage = '';
    }, 550);
  }

  closeSuccessAlert() {
    setTimeout(() => {
      UIkit.alert('#successAlert').close();
    }, 4000);
    setTimeout(() => {
      this.successMessage = '';
    }, 4550);
  }

}
