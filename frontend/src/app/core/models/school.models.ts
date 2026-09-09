export interface GradeStats {
  classes: number;
  students: number;
  female?: number;
}

export interface LocationStatsBreakdown {
  name: string;
  classes: number;
  students: number;
  female: number;
  g6: GradeStats;
  g7: GradeStats;
  g8: GradeStats;
  g9: GradeStats;
}

export interface SchoolStatsDetail {
  grades: {
    g6: GradeStats;
    g7: GradeStats;
    g8: GradeStats;
    g9: GradeStats;
  };
  locationsBreakdown: {
    main: LocationStatsBreakdown;
    ph1: LocationStatsBreakdown;
    ph2: LocationStatsBreakdown;
  };
}

export interface LocationInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  studentCount: number;
  femaleStudentCount: number;
  classCount: number;
  userCount?: number;
}

export interface SchoolInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principalName?: string;
  totalStudents: number;
  totalFemaleStudents: number;
  totalClasses: number;
  totalStaff: number;
  schoolYear: string;
  description?: string;
  statsJson?: string | SchoolStatsDetail;
  locations?: LocationInfo[];
  orgUnitsCount?: number;
}
