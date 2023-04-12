import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { SurveyFormComponent } from "./my-surveys/survey-form/survey-form.component";
import { ContributionsHomeComponent } from "./home/contributions-home.component";
import { MySurveysComponent } from "./my-surveys/my-surveys.component";
import { MyGroupComponent } from "./my-group/my-group.component";
import {AuthenticationGuardService} from "../../services/authentication-guard.service";
import {CoordinatorsComponent} from "./coordinators/coordinators.component";
import {SurveysListComponent} from "./coordinators/surveys-list/surveys-list.component";
import {HistoryComponent} from "./survey-history/history.component";
import {StakeholdersComponent} from "./coordinators/stakeholders/stakeholders.component";
import {EditManagerComponent} from "./coordinators/stakeholders/edit-managers/edit-manager.component";

const contributionsDashboardRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'home'
      },
      {
        path: 'home',
        component: ContributionsHomeComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'mySurveys',
        component: MySurveysComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'mySurveys/:surveyId/answer',
        component: SurveyFormComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'surveyTemplates/:surveyId/freeView',
        component: SurveyFormComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'mySurveys/:surveyId/answer/view',
        component: SurveyFormComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'stakeholder/:stakeholderId/survey/:surveyId/view',
        component: SurveyFormComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'mySurveys/:surveyId/answer/validate',
        component: SurveyFormComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'mySurveys/:surveyId/:answerId/history',
        component: HistoryComponent,
        canActivate: [AuthenticationGuardService],
        data: {
          showSideMenu: false,
          showFooter: false
        }
      },
      {
        path: 'surveys/:surveyId/:answerId/history',
        component: HistoryComponent,
        canActivate: [AuthenticationGuardService],
        data: {
          showSideMenu: false,
          showFooter: false
        }
      },
      {
        path: 'group',
        component: MyGroupComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'surveys',
        component: CoordinatorsComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'surveyTemplates',
        component: SurveysListComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'stakeholders',
        component: StakeholdersComponent,
        canActivate: [AuthenticationGuardService]
      },
      {
        path: 'stakeholders/:id',
        component: EditManagerComponent,
        canActivate: [AuthenticationGuardService]
      }
    ]
  }
];

@NgModule ({
  imports: [RouterModule.forChild(contributionsDashboardRoutes)],
  exports: [RouterModule]
})

export class ContributionsDashboardRoutingModule {}
