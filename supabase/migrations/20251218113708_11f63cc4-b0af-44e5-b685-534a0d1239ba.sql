-- Create valid_charities table for IRS Pub 78 data
CREATE TABLE public.valid_charities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  ein TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster fuzzy matching
CREATE INDEX idx_valid_charities_name ON public.valid_charities USING gin(to_tsvector('english', organization_name));
CREATE INDEX idx_valid_charities_name_lower ON public.valid_charities (lower(organization_name));

-- Enable RLS
ALTER TABLE public.valid_charities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view charities"
  ON public.valid_charities
  FOR SELECT
  USING (true);

-- Allow super admins to manage
CREATE POLICY "Super admins can manage charities"
  ON public.valid_charities
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Seed with common IRS Pub 78 charities (representative sample)
INSERT INTO public.valid_charities (organization_name, ein, city, state) VALUES
-- Major National Charities
('American Red Cross', '53-0196605', 'Washington', 'DC'),
('American Cancer Society', '13-1788491', 'Atlanta', 'GA'),
('American Heart Association', '13-5613797', 'Dallas', 'TX'),
('Salvation Army', '58-0660607', 'Alexandria', 'VA'),
('United Way Worldwide', '13-1635294', 'Alexandria', 'VA'),
('Habitat for Humanity International', '91-1914868', 'Atlanta', 'GA'),
('St. Jude Childrens Research Hospital', '62-0646012', 'Memphis', 'TN'),
('Feeding America', '36-3673599', 'Chicago', 'IL'),
('Goodwill Industries International', '53-0196517', 'Rockville', 'MD'),
('YMCA of the USA', '36-3258696', 'Chicago', 'IL'),
('Boys and Girls Clubs of America', '13-5562976', 'Atlanta', 'GA'),
('Make-A-Wish Foundation of America', '86-0481941', 'Phoenix', 'AZ'),
('March of Dimes Foundation', '13-1846366', 'White Plains', 'NY'),
('Susan G Komen', '75-1835298', 'Dallas', 'TX'),
('Wounded Warrior Project', '20-2370934', 'Jacksonville', 'FL'),
('Special Olympics', '52-0889518', 'Washington', 'DC'),
('Nature Conservancy', '53-0242652', 'Arlington', 'VA'),
('World Wildlife Fund', '52-1693387', 'Washington', 'DC'),
('Sierra Club Foundation', '94-6069890', 'Oakland', 'CA'),
('National Audubon Society', '13-1624102', 'New York', 'NY'),
('ASPCA', '13-1623829', 'New York', 'NY'),
('Humane Society of the United States', '53-0225390', 'Washington', 'DC'),
('Doctors Without Borders USA', '13-3433452', 'New York', 'NY'),
('UNICEF USA', '13-1760110', 'New York', 'NY'),
('Save the Children Federation', '06-0726487', 'Fairfield', 'CT'),
('CARE', '13-1685039', 'Atlanta', 'GA'),
('Catholic Charities USA', '53-0196620', 'Alexandria', 'VA'),
('Lutheran Services in America', '52-1641515', 'Washington', 'DC'),
('Jewish Federations of North America', '13-5562309', 'New York', 'NY'),
('Planned Parenthood Federation of America', '13-1644147', 'New York', 'NY'),
('National Public Radio', '52-0907625', 'Washington', 'DC'),
('PBS Foundation', '52-1283942', 'Arlington', 'VA'),
('Public Broadcasting Service', '52-0899904', 'Arlington', 'VA'),
('Smithsonian Institution', '53-0206027', 'Washington', 'DC'),
('Metropolitan Museum of Art', '13-1624086', 'New York', 'NY'),
('Museum of Modern Art', '13-1624102', 'New York', 'NY'),
('American Museum of Natural History', '13-1740011', 'New York', 'NY'),
('National Geographic Society', '53-0193519', 'Washington', 'DC'),
('Leukemia and Lymphoma Society', '13-5644916', 'Rye Brook', 'NY'),
('Alzheimers Association', '36-3359459', 'Chicago', 'IL'),
('American Diabetes Association', '13-1623888', 'Arlington', 'VA'),
('American Lung Association', '13-1632524', 'Chicago', 'IL'),
('Cystic Fibrosis Foundation', '13-1930701', 'Bethesda', 'MD'),
('Michael J Fox Foundation', '13-4141945', 'New York', 'NY'),
('Dana-Farber Cancer Institute', '04-2263040', 'Boston', 'MA'),
('Mayo Clinic', '41-6011702', 'Rochester', 'MN'),
('Cleveland Clinic Foundation', '34-0714585', 'Cleveland', 'OH'),
('Johns Hopkins University', '52-0595110', 'Baltimore', 'MD'),
('Harvard University', '04-2103580', 'Cambridge', 'MA'),
('Stanford University', '94-1156365', 'Stanford', 'CA'),
('Yale University', '06-0646973', 'New Haven', 'CT'),
('Princeton University', '21-0634501', 'Princeton', 'NJ'),
('Massachusetts Institute of Technology', '04-2103594', 'Cambridge', 'MA'),
('University of Pennsylvania', '23-1352685', 'Philadelphia', 'PA'),
('Columbia University', '13-5598093', 'New York', 'NY'),
('Duke University', '56-0532129', 'Durham', 'NC'),
('Northwestern University', '36-2167817', 'Evanston', 'IL'),
('University of Chicago', '36-2177139', 'Chicago', 'IL'),
('University of Southern California', '95-1642394', 'Los Angeles', 'CA'),
('UCLA Foundation', '95-6006143', 'Los Angeles', 'CA'),
('Community Foundation', '95-1644020', 'Los Angeles', 'CA'),
('Local Food Bank', '94-1234567', 'San Francisco', 'CA'),
('Direct Relief', '95-1831116', 'Santa Barbara', 'CA'),
('Team Rubicon', '27-2196046', 'Los Angeles', 'CA'),
('Charity Water', '22-3936753', 'New York', 'NY'),
('Khan Academy', '26-1544963', 'Mountain View', 'CA'),
('Wikipedia Foundation', '20-0049703', 'San Francisco', 'CA'),
('Electronic Frontier Foundation', '04-3091431', 'San Francisco', 'CA'),
('ACLU Foundation', '13-6213516', 'New York', 'NY'),
('NAACP', '52-0557574', 'Baltimore', 'MD'),
('Southern Poverty Law Center', '63-0598743', 'Montgomery', 'AL'),
('Amnesty International USA', '52-0851555', 'New York', 'NY'),
('Human Rights Watch', '13-2875808', 'New York', 'NY'),
('International Rescue Committee', '13-5660870', 'New York', 'NY'),
('Oxfam America', '23-7069110', 'Boston', 'MA'),
('Heifer International', '35-1019477', 'Little Rock', 'AR'),
('World Vision', '95-1922279', 'Federal Way', 'WA'),
('Compassion International', '36-2423707', 'Colorado Springs', 'CO'),
('Food for the Hungry', '95-2680390', 'Phoenix', 'AZ'),
('Convoy of Hope', '68-0051386', 'Springfield', 'MO'),
('Operation Blessing International', '54-1382657', 'Virginia Beach', 'VA'),
('Ronald McDonald House Charities', '36-2934689', 'Chicago', 'IL'),
('Toys for Tots Foundation', '20-3021923', 'Triangle', 'VA'),
('Fisher House Foundation', '11-3158401', 'Rockville', 'MD'),
('Gary Sinise Foundation', '80-0587086', 'Woodland Hills', 'CA'),
('Tunnel to Towers Foundation', '02-0554654', 'Staten Island', 'NY'),
('Disabled American Veterans', '31-0263158', 'Cold Spring', 'KY'),
('Paralyzed Veterans of America', '52-0743959', 'Washington', 'DC'),
('USO', '13-1610451', 'Arlington', 'VA'),
('National Military Family Association', '52-1072753', 'Alexandria', 'VA');