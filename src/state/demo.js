const person = (id, firstNames, surname, familyName, birth, death, gender) => ({
  id, firstNames, surname, familyName, birth, death, gender,
});

const link = (type, a, b, blood) => ({ id: `${type}-${a}-${b}`, type, a, b, blood });

export function demoData() {
  const people = [
    person('jan', 'Jan', 'Kowalski', '', '1921-04-12', '1994-11-03', 'm'),
    person('maria', 'Maria', 'Kowalska', 'Nowak', '1925-08-30', '2011-02-17', 'f'),
    person('stefan', 'Stefan', 'Zieliński', '', '1923-01-09', '1988-06-21', 'm'),
    person('helena', 'Helena', 'Zielińska', 'Mazur', '1927-05-14', '2015-12-01', 'f'),
    person('piotr', 'Piotr', 'Kowalski', '', '1948-03-22', '', 'm'),
    person('ewa', 'Ewa', 'Kowalska', 'Zielińska', '1951-10-05', '', 'f'),
    person('anna', 'Anna', 'Wiśniewska', 'Kowalska', '1953-07-19', '', 'f'),
    person('marek', 'Marek', 'Wiśniewski', '', '1950-02-11', '2019-09-30', 'm'),
    person('tomasz', 'Tomasz', 'Kowalski', '', '1976-06-02', '', 'm'),
    person('julia', 'Julia', 'Kowalska', 'Lewandowska', '1978-12-24', '', 'f'),
    person('kasia', 'Katarzyna', 'Kowalska', '', '1980-09-15', '', 'f'),
    person('ola', 'Aleksandra', 'Wiśniewska', '', '1982-04-08', '', 'f'),
    person('michal', 'Michał', 'Wiśniewski', '', '1985-01-27', '', 'm'),
    person('zosia', 'Zofia', 'Kowalska', '', '2008-05-03', '', 'f'),
    person('kuba', 'Jakub', 'Kowalski', '', '2011-11-11', '', 'm'),
  ];

  const links = [
    link('partner', 'jan', 'maria', false),
    link('partner', 'stefan', 'helena', false),
    link('partner', 'piotr', 'ewa', false),
    link('partner', 'anna', 'marek', false),
    link('partner', 'tomasz', 'julia', false),
    link('parent', 'jan', 'piotr', true),
    link('parent', 'maria', 'piotr', true),
    link('parent', 'jan', 'anna', true),
    link('parent', 'maria', 'anna', true),
    link('parent', 'stefan', 'ewa', true),
    link('parent', 'helena', 'ewa', true),
    link('parent', 'piotr', 'tomasz', true),
    link('parent', 'ewa', 'tomasz', true),
    link('parent', 'piotr', 'kasia', true),
    link('parent', 'ewa', 'kasia', true),
    link('parent', 'anna', 'ola', true),
    link('parent', 'marek', 'ola', true),
    link('parent', 'anna', 'michal', false),
    link('parent', 'marek', 'michal', false),
    link('parent', 'tomasz', 'zosia', true),
    link('parent', 'julia', 'zosia', true),
    link('parent', 'tomasz', 'kuba', true),
    link('parent', 'julia', 'kuba', true),
  ];

  return { people, links };
}
