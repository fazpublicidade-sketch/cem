// Horários usados quando o banco de dados ainda não está ligado
// (ou se ele estiver fora do ar). Mesmo conteúdo dos dados iniciais
// de supabase/schema.sql.
window.CM_PADRAO = {
  funcionamento: [
    { local: "academia", dias: "Segunda a sexta", horario: "05h às 22h", ordem: 1 },
    { local: "academia", dias: "Sábado, domingo e feriados", horario: "08h às 12h", ordem: 2 },
    { local: "pilates", dias: "Segunda a sexta", horario: "07h às 11h e 15h às 21h", ordem: 3 },
  ],
  grade_aulas: [
    ["coletivas", 1, "07:00", "Jump"], ["coletivas", 1, "08:00", "Zumba"], ["coletivas", 1, "21:00", "Muay Thai"],
    ["coletivas", 2, "08:15", "GAP"], ["coletivas", 2, "21:00", "Jiu-Jitsu"],
    ["coletivas", 3, "08:15", "Jump"], ["coletivas", 3, "19:00", "Jump"], ["coletivas", 3, "21:00", "Muay Thai"],
    ["coletivas", 4, "08:15", "Pilates Solo"], ["coletivas", 4, "17:00", "Power Glúteo"], ["coletivas", 4, "21:00", "Jiu-Jitsu"],
    ["coletivas", 5, "08:15", "Funcional"], ["coletivas", 5, "20:00", "Fit Dance"],
    ["coletivas", 6, "09:00", "Jump"], ["coletivas", 6, "11:00", "Fit Dance"],

    ["box", 1, "06:00", "CrossMazzei"], ["box", 1, "12:00", "CrossMazzei"], ["box", 1, "17:00", "Hyrox", null, true],
    ["box", 1, "18:00", "CrossMazzei"], ["box", 1, "19:00", "CrossMazzei"], ["box", 1, "20:00", "CrossMazzei"],
    ["box", 2, "06:00", "CrossMazzei"], ["box", 2, "07:00", "Hyrox", null, true], ["box", 2, "12:00", "Hyrox", null, true],
    ["box", 2, "12:00", "CrossMazzei"], ["box", 2, "18:00", "CrossMazzei"], ["box", 2, "19:00", "Hyrox", null, true],
    ["box", 2, "20:00", "CrossMazzei"],
    ["box", 3, "06:00", "CrossMazzei"], ["box", 3, "07:00", "Hyrox", null, true], ["box", 3, "12:00", "CrossMazzei"],
    ["box", 3, "17:00", "CrossMazzei"], ["box", 3, "18:00", "CrossMazzei"], ["box", 3, "20:00", "Hyrox", null, true],
    ["box", 4, "06:00", "CrossMazzei"], ["box", 4, "07:00", "Hyrox", null, true], ["box", 4, "12:00", "Hyrox", null, true],
    ["box", 4, "12:00", "CrossMazzei"], ["box", 4, "18:00", "CrossMazzei"], ["box", 4, "19:00", "Hyrox", null, true],
    ["box", 4, "20:00", "CrossMazzei"],
    ["box", 5, "06:00", "CrossMazzei"], ["box", 5, "07:00", "Hyrox", null, true], ["box", 5, "12:00", "CrossMazzei"],
    ["box", 5, "18:00", "CrossMazzei"], ["box", 5, "19:00", "CrossMazzei"],
    ["box", 6, "07:30", "Hyrox", "Domingos alternados", true], ["box", 6, "10:00", "CrossMazzei"],
  ].map(([grade, dia, hora, atividade, observacao = null, destaque = false]) =>
    ({ grade, dia, hora, atividade, observacao, destaque })),
  publicacoes: [],
  parceiros: [],
};
