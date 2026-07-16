-- Additional enrollment capture fields.
--   college         : student's college / institution
--   email           : student's email
--   start_date      : when the student's program starts
--   end_date        : when it ends
--   enrollment_date : the date the student actually enrolled (defaults to today)

alter table enrollments add column if not exists college text;
alter table enrollments add column if not exists email text;
alter table enrollments add column if not exists start_date date;
alter table enrollments add column if not exists end_date date;
alter table enrollments add column if not exists enrollment_date date default current_date;
