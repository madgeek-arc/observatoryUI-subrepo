import {Stakeholder, User} from "./userInfo";

export class SurveyAnswer {
  id: string;
  surveyId: string;
  stakeholderId: string;
  type: string;
  answer: Object;
  metadata: Metadata;
  history: History;
  validated: boolean;
  published: boolean;
}

export class History {
  entries: Entries[];
}

export class DisplayHistory {
  entries: DisplayEntries[];
}

export class ChapterAnswer {
  chapterId: string;
  answer: Object;
  metadata: Metadata;
  id: string;
}

export class ResourcePermission {
  resourceId: string;
  permissions: string[];
}

export class Metadata {
  creationDate: string;
  createdBy: string;
  modificationDate: string;
  modifiedBy: string;
}

export class SurveyInfo {
  surveyId: string;
  surveyAnswerId: string;
  surveyName: string;
  validated: boolean;
  published: boolean;
  lastUpdate: Date;
  editedBy: string[];
  progressRequired: Progress;
  progressTotal: Progress;
  stakeholder: Stakeholder;
}

export class Progress {
  current: number;
  total: number;
}

export class Entries {
  userId: string;
  time: number;
  action: string;
}

export class DisplayEntries {
  email: string;
  fullname: string;
  role: string;
  comment: string;
  time: number;
  action: Action;
  resourceId: string;
  version: string;
}

export class Action {
  type: string;
  registryVersion: string;
  pointsTo: string;
}

export class SurveyAnswerPublicMetadata {
  lastUpdate: Date;
  editors: User[];
}
