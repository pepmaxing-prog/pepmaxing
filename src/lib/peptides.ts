import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type CategoryId = 'healing' | 'growth' | 'weight' | 'longevity' | 'cognitive' | 'hormonal' | 'immune' | 'sleep';

export type Category = { id: CategoryId; label: string; color: string; blurb: string };

export const CATEGORIES: Category[] = [
  { id: 'healing', label: 'Healing', color: '#34D399', blurb: 'Tissue, tendon and gut repair' },
  { id: 'growth', label: 'Growth hormone', color: '#7DD3FC', blurb: 'GH release and body composition' },
  { id: 'weight', label: 'Weight loss', color: '#FBBF24', blurb: 'Appetite, glucose and fat loss' },
  { id: 'longevity', label: 'Longevity', color: '#C084FC', blurb: 'Cellular and mitochondrial health' },
  { id: 'cognitive', label: 'Cognitive', color: '#818CF8', blurb: 'Focus, mood and neuroprotection' },
  { id: 'hormonal', label: 'Hormonal', color: '#FB7185', blurb: 'Reproductive and sexual health' },
  { id: 'immune', label: 'Immune', color: '#2DD4BF', blurb: 'Immune modulation and defence' },
  { id: 'sleep', label: 'Sleep', color: '#A78BFA', blurb: 'Sleep architecture and recovery' },
];

export type Status = 'approved' | 'research' | 'supplement';
export type Route = 'Subcutaneous' | 'Intramuscular' | 'Oral' | 'Nasal' | 'Topical';

export type Peptide = {
  id: string;
  name: string;
  /** The short handle people use for it, e.g. "The Healer". */
  nickname: string;
  category: CategoryId;
  /** One line for the list. */
  blurb: string;
  tags: string[];
  /** Regulatory status of the compound itself. */
  status: Status;
  /** Approved brand names or trial names, when relevant. */
  aka?: string;
  route: Route;
  halfLife?: string;
  /** Two or three plain-English sentences. */
  overview: string;
  mechanism: string;
  /** Evidence and safety in one honest paragraph. */
  evidence: string;
};

/**
 * Curated catalogue. Descriptions stick to what's established; where human data is thin the
 * `evidence` line says so. Dose ranges are deliberately absent until each has a citation.
 */
export const PEPTIDES: Peptide[] = [
  // ---- Healing -----------------------------------------------------------------------------
  {
    id: 'bpc-157',
    name: 'BPC-157',
    nickname: 'The Healer',
    category: 'healing',
    blurb: 'Gastric-derived pentadecapeptide studied for tendon, ligament and gut repair.',
    tags: ['Recovery', 'Gut', 'Tendons'],
    status: 'research',
    route: 'Subcutaneous',
    halfLife: 'Not established in humans',
    overview: 'BPC-157 is a 15-amino-acid fragment of a protective protein found in gastric juice. It is one of the most talked-about recovery peptides, used for soft-tissue injuries and gut complaints.',
    mechanism: 'In animal models it promotes new blood-vessel growth (angiogenesis), upregulates growth-factor receptors in tendon cells and modulates the nitric-oxide system, which together speed tissue repair.',
    evidence: 'The evidence base is almost entirely animal studies; controlled human trials are lacking. It is not approved by any regulator and is sold as a research compound.',
  },
  {
    id: 'tb-500',
    name: 'TB-500',
    nickname: 'The Repair Agent',
    category: 'healing',
    blurb: 'Synthetic fragment of thymosin beta-4 that supports muscle, tendon and skin repair.',
    tags: ['Recovery', 'Flexibility', 'Performance'],
    status: 'research',
    aka: 'Thymosin beta-4 (17–23) fragment',
    route: 'Subcutaneous',
    overview: 'TB-500 is a synthetic version of the active region of thymosin beta-4, a protein present in almost every human cell that rises sharply at sites of injury.',
    mechanism: 'It binds actin and promotes cell migration, so repair cells reach damaged tissue faster; it also reduces inflammation and encourages new blood-vessel growth.',
    evidence: 'Full-length thymosin beta-4 has been through early human trials for wound and cardiac repair; the TB-500 fragment itself has mostly animal data. Research compound.',
  },
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    nickname: 'The Skin Remodeler',
    category: 'healing',
    blurb: 'Naturally occurring copper peptide that stimulates collagen and wound healing.',
    tags: ['Skin', 'Hair', 'Anti-aging'],
    status: 'research',
    route: 'Topical',
    overview: 'GHK-Cu is a copper-binding tripeptide found in human plasma, saliva and urine whose levels fall steeply with age. It is widely used in skincare and studied for wound healing.',
    mechanism: 'It signals fibroblasts to make collagen and elastin, remodels damaged tissue, and resets the expression of a large number of genes toward a younger pattern in lab studies.',
    evidence: 'Topical GHK-Cu has decent human data for skin firmness and wound healing. Injectable use is far less studied. Sold as a cosmetic ingredient and research compound.',
  },
  {
    id: 'kpv',
    name: 'KPV',
    nickname: 'The Inflammation Tamer',
    category: 'healing',
    blurb: 'Tripeptide from alpha-MSH with strong anti-inflammatory effects, especially in the gut.',
    tags: ['Gut', 'Inflammation', 'Skin'],
    status: 'research',
    route: 'Oral',
    overview: 'KPV is the last three amino acids of the hormone alpha-MSH and carries most of its anti-inflammatory activity without affecting pigmentation.',
    mechanism: 'It dampens the NF-κB inflammatory pathway inside cells and is taken up by gut lining cells, which is why it is studied for colitis and other bowel inflammation.',
    evidence: 'Compelling animal and cell data for colitis and skin inflammation; human trials are limited. Research compound.',
  },
  {
    id: 'ara-290',
    name: 'ARA-290',
    nickname: 'The Nerve Protector',
    category: 'healing',
    blurb: 'Erythropoietin-derived peptide that protects tissue without raising red blood cells.',
    tags: ['Nerve pain', 'Recovery', 'Metabolic'],
    status: 'research',
    aka: 'Cibinetide',
    route: 'Subcutaneous',
    halfLife: 'About 2 minutes in plasma, long tissue effect',
    overview: 'ARA-290 was engineered from erythropoietin to keep its tissue-protective effects while dropping the blood-cell stimulation that makes EPO risky.',
    mechanism: 'It activates the innate repair receptor, reducing inflammation and helping small nerve fibres recover.',
    evidence: 'Phase 2 human trials in sarcoidosis and diabetic neuropathy showed improved small-fibre nerve measures and symptoms. Not approved; research compound.',
  },
  {
    id: 'll-37',
    name: 'LL-37',
    nickname: 'The Natural Defender',
    category: 'immune',
    blurb: 'The only human cathelicidin: broad antimicrobial and immune-signalling peptide.',
    tags: ['Immune', 'Antimicrobial', 'Wound healing'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'LL-37 is produced by immune and skin cells as a first line of defence. It kills bacteria directly and coordinates the immune response.',
    mechanism: 'It disrupts microbial membranes and neutralises bacterial toxins while recruiting immune cells and promoting wound closure.',
    evidence: 'A topical LL-37 formulation reached phase 2 trials for hard-to-heal leg ulcers. Systemic use is poorly studied and may provoke inflammation. Research compound.',
  },
  {
    id: 'thymosin-alpha-1',
    name: 'Thymosin Alpha-1',
    nickname: 'The Immune Regulator',
    category: 'immune',
    blurb: 'Thymic peptide that boosts T-cell function; approved in several countries for hepatitis.',
    tags: ['Immune', 'Antiviral', 'Longevity'],
    status: 'approved',
    aka: 'Zadaxin (approved in 30+ countries, not the US)',
    route: 'Subcutaneous',
    halfLife: 'About 2 hours',
    overview: 'Thymosin alpha-1 is a 28-amino-acid peptide originally isolated from the thymus. It is a licensed medicine in many countries for chronic hepatitis B and as a vaccine adjuvant.',
    mechanism: 'It matures T-cells, increases natural-killer activity and steers the immune system toward clearing infected cells.',
    evidence: 'Decades of clinical use and randomised trials in hepatitis, sepsis and cancer support; generally well tolerated. Not FDA-approved in the US.',
  },

  // ---- Growth hormone -----------------------------------------------------------------------
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    nickname: 'The Clean GH Pulse',
    category: 'growth',
    blurb: 'Selective growth-hormone secretagogue that spares cortisol and appetite.',
    tags: ['Sleep', 'Recovery', 'Body composition'],
    status: 'research',
    route: 'Subcutaneous',
    halfLife: 'About 2 hours',
    overview: 'Ipamorelin is a five-amino-acid ghrelin mimetic that prompts the pituitary to release a natural pulse of growth hormone.',
    mechanism: 'It activates the ghrelin (GHS-R1a) receptor with unusual selectivity, releasing GH without the cortisol, prolactin or hunger spikes older GHRPs cause.',
    evidence: 'Human studies confirm a clean GH release; it was in trials for post-operative bowel recovery but never approved. Research compound, often paired with CJC-1295.',
  },
  {
    id: 'cjc-1295',
    name: 'CJC-1295',
    nickname: 'The Long-Acting GH Booster',
    category: 'growth',
    blurb: 'GHRH analog that raises GH and IGF-1 for days; the DAC version lasts about a week.',
    tags: ['Recovery', 'Body composition', 'Longevity'],
    status: 'research',
    aka: 'Also sold without DAC as Mod GRF 1-29',
    route: 'Subcutaneous',
    halfLife: '6–8 days with DAC; about 30 minutes without',
    overview: 'CJC-1295 is a modified growth-hormone-releasing hormone. The DAC version binds to albumin so a single dose keeps GH elevated for days; the no-DAC version gives a short, natural-looking pulse.',
    mechanism: 'It stimulates GHRH receptors on the pituitary, increasing the amount of GH released with each natural pulse and lifting IGF-1.',
    evidence: 'Phase 1–2 human trials showed sustained GH and IGF-1 increases; development stopped after an unrelated death in a trial participant. Research compound.',
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    nickname: 'The Physiological GH Stimulator',
    category: 'growth',
    blurb: 'The first 29 amino acids of GHRH; restores natural GH rhythm.',
    tags: ['Sleep', 'Recovery', 'Longevity'],
    status: 'approved',
    aka: 'Formerly Geref; now compounded',
    route: 'Subcutaneous',
    halfLife: 'About 10–20 minutes',
    overview: 'Sermorelin is the active portion of growth-hormone-releasing hormone. It was FDA-approved for childhood GH deficiency and is now widely compounded for adults.',
    mechanism: 'It acts on the pituitary to release GH in pulses that follow the body\u2019s own feedback loops, which is why it is considered gentler than GH itself.',
    evidence: 'Well studied and generally safe; the brand product was withdrawn for commercial rather than safety reasons. Available from compounding pharmacies by prescription.',
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    nickname: 'The Belly Fat Buster',
    category: 'growth',
    blurb: 'FDA-approved GHRH analog that reduces visceral abdominal fat.',
    tags: ['Visceral fat', 'Body composition', 'Metabolic'],
    status: 'approved',
    aka: 'Egrifta',
    route: 'Subcutaneous',
    halfLife: 'About 30 minutes',
    overview: 'Tesamorelin is a stabilised GHRH analog approved for reducing excess abdominal fat in people with HIV-associated lipodystrophy.',
    mechanism: 'It boosts natural GH pulses, which increases fat breakdown, particularly in visceral fat around the organs.',
    evidence: 'Randomised trials show around 15–18% reductions in visceral fat over 6–12 months; fat returns when stopped. FDA-approved for its indication; other uses are off-label.',
  },
  {
    id: 'ghrp-2',
    name: 'GHRP-2',
    nickname: 'The Appetite Amplifier',
    category: 'growth',
    blurb: 'Potent GH secretagogue that also stimulates hunger.',
    tags: ['Recovery', 'Appetite', 'Body composition'],
    status: 'research',
    aka: 'Pralmorelin',
    route: 'Subcutaneous',
    overview: 'GHRP-2 is a synthetic hexapeptide and one of the strongest growth-hormone releasers per dose. In Japan it is used as a diagnostic agent for GH deficiency.',
    mechanism: 'It stimulates the ghrelin receptor strongly, releasing GH while also raising appetite and, to a lesser degree, cortisol and prolactin.',
    evidence: 'Human data exists from its diagnostic use; long-term therapeutic use is unstudied. Research compound.',
  },
  {
    id: 'ghrp-6',
    name: 'GHRP-6',
    nickname: 'The Hunger Hormone',
    category: 'growth',
    blurb: 'Early GH secretagogue with a marked appetite-stimulating effect.',
    tags: ['Appetite', 'Recovery'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'GHRP-6 was the first synthetic growth-hormone-releasing peptide. It is known for strong hunger within minutes of injection.',
    mechanism: 'A ghrelin mimetic: it releases GH from the pituitary and triggers hunger signals in the hypothalamus.',
    evidence: 'Mostly older human pharmacology studies; not developed as a medicine. Research compound.',
  },
  {
    id: 'hexarelin',
    name: 'Hexarelin',
    nickname: 'The Powerful GH Secretagogue',
    category: 'growth',
    blurb: 'Strong GH releaser with studied cardioprotective effects.',
    tags: ['Recovery', 'Cardiac', 'Performance'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'Hexarelin is a potent hexapeptide GH secretagogue notable for direct effects on heart tissue seen in research.',
    mechanism: 'Activates the ghrelin receptor and a separate cardiac receptor (CD36), releasing GH and protecting heart muscle in animal models.',
    evidence: 'Small human studies confirm GH release; GH response tends to fade with continued use. Research compound.',
  },
  {
    id: 'mk-677',
    name: 'MK-677',
    nickname: 'The Oral GH Secretagogue',
    category: 'growth',
    blurb: 'Oral, non-peptide ghrelin mimetic that raises GH and IGF-1 around the clock.',
    tags: ['Sleep', 'Appetite', 'Body composition'],
    status: 'research',
    aka: 'Ibutamoren',
    route: 'Oral',
    halfLife: 'About 4–6 hours; IGF-1 stays elevated for 24 hours',
    overview: 'MK-677 is not technically a peptide but a small molecule that mimics ghrelin and can be taken by mouth, which is why it appears in most peptide libraries.',
    mechanism: 'It activates the ghrelin receptor, amplifying GH pulses and sustaining IGF-1; it also increases appetite and deepens sleep.',
    evidence: 'Year-long human trials showed increased IGF-1 and lean mass, but also raised blood sugar and insulin; a heart-failure trial was stopped. Research compound.',
  },
  {
    id: 'hgh-frag-176-191',
    name: 'HGH Fragment 176–191',
    nickname: 'The Fat Burner',
    category: 'weight',
    blurb: 'Tail end of growth hormone said to keep the fat-loss effect without the growth effect.',
    tags: ['Fat loss', 'Metabolic'],
    status: 'research',
    aka: 'Closely related to AOD-9604',
    route: 'Subcutaneous',
    overview: 'This fragment is the C-terminal piece of human growth hormone thought to carry its fat-mobilising action.',
    mechanism: 'It appears to increase fat breakdown and reduce fat formation without stimulating IGF-1 or affecting blood sugar.',
    evidence: 'Animal data is positive; the related AOD-9604 failed to show meaningful weight loss in human trials. Research compound.',
  },

  // ---- Weight loss / metabolic ---------------------------------------------------------------
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    nickname: 'The Weekly GLP-1',
    category: 'weight',
    blurb: 'Once-weekly GLP-1 receptor agonist behind Ozempic and Wegovy.',
    tags: ['Weight loss', 'Blood sugar', 'Cardiac'],
    status: 'approved',
    aka: 'Ozempic, Wegovy, Rybelsus (oral)',
    route: 'Subcutaneous',
    halfLife: 'About 7 days',
    overview: 'Semaglutide mimics the gut hormone GLP-1. It is FDA-approved for type 2 diabetes, chronic weight management and reducing cardiovascular risk.',
    mechanism: 'It slows stomach emptying, increases insulin release when glucose is high, and acts on appetite centres in the brain so people feel full on less.',
    evidence: 'In the STEP 1 trial adults lost about 15% of body weight over 68 weeks; SELECT showed 20% fewer major cardiovascular events. Nausea and GI effects are common early on.',
  },
  {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    nickname: 'The Dual Agonist',
    category: 'weight',
    blurb: 'GIP and GLP-1 dual agonist; the strongest approved weight-loss medication.',
    tags: ['Weight loss', 'Blood sugar', 'Metabolic'],
    status: 'approved',
    aka: 'Mounjaro, Zepbound',
    route: 'Subcutaneous',
    halfLife: 'About 5 days',
    overview: 'Tirzepatide activates two gut-hormone receptors at once. It is approved for type 2 diabetes, obesity and obstructive sleep apnoea in obesity.',
    mechanism: 'GLP-1 action suppresses appetite and improves insulin response; adding GIP appears to enhance fat metabolism and reduce nausea relative to GLP-1 alone.',
    evidence: 'SURMOUNT-1 reported up to 22.5% body-weight loss at 72 weeks on the highest dose. GI side effects are common; thyroid C-cell tumours seen in rodents carry a boxed warning.',
  },
  {
    id: 'retatrutide',
    name: 'Retatrutide',
    nickname: 'The Triple Threat',
    category: 'weight',
    blurb: 'GLP-1, GIP and glucagon triple agonist in phase 3 trials.',
    tags: ['Weight loss', 'Metabolic', 'Liver fat'],
    status: 'research',
    aka: 'LY3437943',
    route: 'Subcutaneous',
    halfLife: 'About 6 days',
    overview: 'Retatrutide adds glucagon-receptor activity to the GLP-1/GIP combination, increasing energy expenditure as well as reducing appetite.',
    mechanism: 'Appetite suppression and insulin support from GLP-1/GIP, plus glucagon-driven increases in fat burning and liver-fat clearance.',
    evidence: 'A phase 2 trial showed about 24% weight loss at 48 weeks at the top dose, the largest seen with any drug. Phase 3 is ongoing; not approved.',
  },
  {
    id: 'liraglutide',
    name: 'Liraglutide',
    nickname: 'The Daily GLP-1',
    category: 'weight',
    blurb: 'Once-daily GLP-1 agonist; the first approved for weight management.',
    tags: ['Weight loss', 'Blood sugar'],
    status: 'approved',
    aka: 'Victoza, Saxenda',
    route: 'Subcutaneous',
    halfLife: 'About 13 hours',
    overview: 'Liraglutide is an earlier GLP-1 analog that requires daily injection. It remains approved for diabetes and obesity, including in adolescents.',
    mechanism: 'Same GLP-1 pathway as semaglutide: slower gastric emptying, glucose-dependent insulin release and reduced appetite.',
    evidence: 'Roughly 8% body-weight loss in trials, less than the weekly agents. Long safety record; GI effects are the main issue.',
  },
  {
    id: 'cagrilintide',
    name: 'Cagrilintide',
    nickname: 'The Satiety Signal',
    category: 'weight',
    blurb: 'Long-acting amylin analog; combined with semaglutide as CagriSema.',
    tags: ['Weight loss', 'Appetite'],
    status: 'research',
    aka: 'CagriSema (with semaglutide)',
    route: 'Subcutaneous',
    halfLife: 'About 7–8 days',
    overview: 'Cagrilintide mimics amylin, a hormone released with insulin that tells the brain a meal is done.',
    mechanism: 'It slows gastric emptying and increases fullness through amylin and calcitonin receptors, a different pathway from GLP-1, so the two stack.',
    evidence: 'CagriSema produced about 20% weight loss at 68 weeks in the phase 3 REDEFINE 1 trial. Not yet approved.',
  },
  {
    id: 'aod-9604',
    name: 'AOD-9604',
    nickname: 'The Modified Fragment',
    category: 'weight',
    blurb: 'Stabilised HGH fragment studied for fat loss and, later, joint repair.',
    tags: ['Fat loss', 'Joints'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'AOD-9604 is HGH fragment 176–191 with a small change for stability. It went through a full clinical programme for obesity in the 2000s.',
    mechanism: 'Intended to stimulate fat breakdown and block fat storage without GH\u2019s effects on growth or blood sugar.',
    evidence: 'Phase 2b trials did not show clinically meaningful weight loss and development stopped; it has GRAS status as a food ingredient in Australia. Research compound.',
  },
  {
    id: 'mots-c',
    name: 'MOTS-c',
    nickname: 'The Exercise Mimetic',
    category: 'weight',
    blurb: 'Mitochondrial-derived peptide that improves insulin sensitivity in animal studies.',
    tags: ['Metabolic', 'Performance', 'Longevity'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'MOTS-c is encoded in mitochondrial DNA rather than the nucleus. Levels rise with exercise and fall with age.',
    mechanism: 'It activates AMPK, the cell\u2019s energy sensor, improving glucose uptake and fat oxidation in muscle.',
    evidence: 'Striking metabolic effects in mice; a small first-in-human trial of an analog (CB4211) suggested safety. Research compound.',
  },
  {
    id: 'survodutide',
    name: 'Survodutide',
    nickname: 'The Liver Ally',
    category: 'weight',
    blurb: 'GLP-1/glucagon dual agonist in phase 3 for obesity and fatty liver disease.',
    tags: ['Weight loss', 'Liver fat'],
    status: 'research',
    aka: 'BI 456906',
    route: 'Subcutaneous',
    overview: 'Survodutide combines GLP-1 appetite effects with glucagon-driven energy expenditure and is being tested for both obesity and MASH (fatty liver disease).',
    mechanism: 'GLP-1 activity reduces intake; glucagon-receptor activity raises energy use and clears liver fat.',
    evidence: 'About 19% weight loss at 46 weeks in phase 2 and strong improvements in liver histology. Phase 3 ongoing; not approved.',
  },

  // ---- Longevity ----------------------------------------------------------------------------
  {
    id: 'epitalon',
    name: 'Epitalon',
    nickname: 'The Telomere Peptide',
    category: 'longevity',
    blurb: 'Synthetic pineal tetrapeptide studied in Russia for ageing and sleep.',
    tags: ['Longevity', 'Sleep', 'Antioxidant'],
    status: 'research',
    aka: 'Epithalon, Epithalamin (natural extract)',
    route: 'Subcutaneous',
    overview: 'Epitalon is a four-amino-acid peptide derived from a pineal gland extract used in Soviet-era geriatric research.',
    mechanism: 'Reported to activate telomerase in cell cultures and to normalise melatonin rhythms in older adults.',
    evidence: 'Mostly Russian studies with small samples; the long-term human data is not independently replicated. Research compound.',
  },
  {
    id: 'ss-31',
    name: 'SS-31',
    nickname: 'The Mitochondrial Guardian',
    category: 'longevity',
    blurb: 'Mitochondria-targeted peptide that stabilises energy production in stressed cells.',
    tags: ['Longevity', 'Cardiac', 'Performance'],
    status: 'research',
    aka: 'Elamipretide',
    route: 'Subcutaneous',
    halfLife: 'About 2–4 hours',
    overview: 'SS-31 concentrates in the inner mitochondrial membrane where it protects cardiolipin, a lipid essential for efficient energy production.',
    mechanism: 'By stabilising cardiolipin it improves ATP output and reduces the reactive oxygen species that damage ageing mitochondria.',
    evidence: 'Late-stage trials in Barth syndrome and mitochondrial myopathy; FDA review has been mixed. Research compound outside those programmes.',
  },
  {
    id: 'humanin',
    name: 'Humanin',
    nickname: 'The Cell Protector',
    category: 'longevity',
    blurb: 'Mitochondrial-derived peptide with neuroprotective and metabolic effects.',
    tags: ['Longevity', 'Neuroprotection'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'Humanin was discovered in the surviving brain tissue of Alzheimer\u2019s patients and is produced from mitochondrial DNA.',
    mechanism: 'It blocks cell-death pathways and improves insulin sensitivity; levels correlate with lifespan in several species.',
    evidence: 'Animal and cell studies only. Research compound.',
  },
  {
    id: 'foxo4-dri',
    name: 'FOXO4-DRI',
    nickname: 'The Senolytic',
    category: 'longevity',
    blurb: 'Experimental peptide that pushes senescent "zombie" cells to self-destruct.',
    tags: ['Longevity', 'Senolytic'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'FOXO4-DRI is a mirror-image peptide designed to break the interaction that keeps aged, non-dividing cells alive.',
    mechanism: 'It displaces FOXO4 from p53, freeing p53 to trigger apoptosis specifically in senescent cells.',
    evidence: 'Restored fitness and kidney function in aged mice in a 2017 study; no human trials. Research compound.',
  },
  {
    id: 'nad-plus',
    name: 'NAD+',
    nickname: 'The Cellular Fuel',
    category: 'longevity',
    blurb: 'Coenzyme central to energy metabolism and DNA repair; declines with age.',
    tags: ['Longevity', 'Energy', 'Metabolic'],
    status: 'supplement',
    route: 'Subcutaneous',
    overview: 'NAD+ is not a peptide but appears in most peptide programmes. It is the coenzyme every cell uses to convert food into energy and to run repair enzymes.',
    mechanism: 'It fuels sirtuins and PARP repair enzymes; restoring levels is thought to support mitochondrial function and DNA maintenance.',
    evidence: 'Oral precursors (NMN, NR) reliably raise blood NAD+; whether injections or infusions improve health outcomes in humans is unproven. Sold as a supplement.',
  },

  // ---- Cognitive ----------------------------------------------------------------------------
  {
    id: 'semax',
    name: 'Semax',
    nickname: 'The Focus Peptide',
    category: 'cognitive',
    blurb: 'ACTH-derived nootropic approved in Russia for stroke and cognitive support.',
    tags: ['Focus', 'Memory', 'Neuroprotection'],
    status: 'approved',
    aka: 'Approved in Russia and Ukraine',
    route: 'Nasal',
    overview: 'Semax is a synthetic heptapeptide based on a fragment of ACTH, prescribed in Russia since the 1990s and used off-label as a nootropic.',
    mechanism: 'It raises BDNF and other growth factors in the brain, modulates dopamine and serotonin, and reduces inflammatory signalling after injury.',
    evidence: 'Russian clinical trials in stroke and optic-nerve disease; little Western replication. Not approved outside the former Soviet states.',
  },
  {
    id: 'selank',
    name: 'Selank',
    nickname: 'The Calm Peptide',
    category: 'cognitive',
    blurb: 'Tuftsin analog with anti-anxiety effects and no sedation.',
    tags: ['Anxiety', 'Mood', 'Focus'],
    status: 'approved',
    aka: 'Approved in Russia',
    route: 'Nasal',
    overview: 'Selank is a stabilised version of tuftsin, a natural immune peptide, developed alongside Semax in Russia and prescribed for anxiety.',
    mechanism: 'It modulates GABA signalling and enkephalin breakdown, producing anxiolytic effects without the sedation or dependence of benzodiazepines.',
    evidence: 'Russian trials in generalised anxiety report benefit comparable to medazepam; limited independent research. Not approved outside Russia.',
  },
  {
    id: 'dihexa',
    name: 'Dihexa',
    nickname: 'The Synapse Builder',
    category: 'cognitive',
    blurb: 'Angiotensin-derived compound that promotes new synapse formation in animals.',
    tags: ['Memory', 'Neuroprotection'],
    status: 'research',
    route: 'Oral',
    overview: 'Dihexa is a small peptide-like molecule developed at Washington State University for cognitive impairment.',
    mechanism: 'It potently activates the HGF/c-Met growth-factor system, driving synapse formation in cell and animal studies.',
    evidence: 'Impressive rodent memory data; no human trials and open questions about growth-factor activation and cancer risk. Research compound.',
  },
  {
    id: 'cerebrolysin',
    name: 'Cerebrolysin',
    nickname: 'The Brain Repair Mix',
    category: 'cognitive',
    blurb: 'Porcine brain-derived peptide mixture used clinically for stroke and dementia.',
    tags: ['Neuroprotection', 'Recovery', 'Memory'],
    status: 'approved',
    aka: 'Approved in Austria, Russia, China and others',
    route: 'Intramuscular',
    overview: 'Cerebrolysin is a mixture of low-molecular-weight peptides and amino acids derived from pig brain, used for decades in parts of Europe and Asia.',
    mechanism: 'It mimics the action of neurotrophic factors, supporting neuron survival and plasticity after injury.',
    evidence: 'Numerous trials in stroke and dementia with mixed but generally positive results; Cochrane reviews call the evidence low certainty. Not FDA-approved.',
  },

  // ---- Hormonal / sexual health --------------------------------------------------------------
  {
    id: 'pt-141',
    name: 'PT-141',
    nickname: 'The Desire Peptide',
    category: 'hormonal',
    blurb: 'Melanocortin agonist approved for low sexual desire in premenopausal women.',
    tags: ['Libido', 'Sexual health'],
    status: 'approved',
    aka: 'Bremelanotide, Vyleesi',
    route: 'Subcutaneous',
    halfLife: 'About 2.7 hours',
    overview: 'PT-141 works in the brain rather than on blood flow, which sets it apart from drugs like sildenafil.',
    mechanism: 'It activates melanocortin-4 receptors in the hypothalamus, increasing sexual desire and arousal signals.',
    evidence: 'FDA-approved in 2019 for hypoactive sexual desire disorder; nausea in about 40% of users and transient blood-pressure rises are the main side effects.',
  },
  {
    id: 'melanotan-ii',
    name: 'Melanotan II',
    nickname: 'The Tanning Peptide',
    category: 'hormonal',
    blurb: 'Non-selective melanocortin agonist that darkens skin and raises libido.',
    tags: ['Tanning', 'Libido'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'Melanotan II was developed as a sunless tanning agent and became the starting point for PT-141.',
    mechanism: 'It stimulates several melanocortin receptors at once, increasing melanin production and sexual arousal while also suppressing appetite.',
    evidence: 'Never approved anywhere; regulators warn about new or changing moles, nausea and unregulated products. Research compound with real safety concerns.',
  },
  {
    id: 'kisspeptin-10',
    name: 'Kisspeptin-10',
    nickname: 'The Fertility Signal',
    category: 'hormonal',
    blurb: 'Master regulator of the reproductive hormone axis.',
    tags: ['Fertility', 'Testosterone', 'Libido'],
    status: 'research',
    route: 'Subcutaneous',
    halfLife: 'About 4 minutes',
    overview: 'Kisspeptin sits at the very top of the reproductive hormone cascade, telling the brain to release GnRH.',
    mechanism: 'Triggers GnRH release, which in turn raises LH, FSH and downstream testosterone or oestrogen.',
    evidence: 'Human trials show reliable LH and testosterone rises and, more recently, improved sexual brain responses in hypoactive desire. Investigational.',
  },
  {
    id: 'gonadorelin',
    name: 'Gonadorelin',
    nickname: 'The Hormone Trigger',
    category: 'hormonal',
    blurb: 'Synthetic GnRH that keeps natural testosterone production going during therapy.',
    tags: ['Testosterone', 'Fertility'],
    status: 'approved',
    aka: 'Factrel; commonly compounded',
    route: 'Subcutaneous',
    halfLife: 'A few minutes',
    overview: 'Gonadorelin is identical to the body\u2019s gonadotropin-releasing hormone. It is used alongside testosterone therapy to preserve testicular function and fertility.',
    mechanism: 'Pulses of GnRH prompt the pituitary to release LH and FSH, maintaining the testes\u2019 own hormone and sperm production.',
    evidence: 'Long clinical history as a diagnostic and fertility agent; effectiveness depends on pulsatile dosing because continuous exposure shuts the axis down.',
  },
  {
    id: 'oxytocin',
    name: 'Oxytocin',
    nickname: 'The Bonding Hormone',
    category: 'hormonal',
    blurb: 'Natural hormone of social bonding, labour and lactation.',
    tags: ['Mood', 'Bonding', 'Libido'],
    status: 'approved',
    aka: 'Pitocin (for labour)',
    route: 'Nasal',
    halfLife: 'About 3–5 minutes',
    overview: 'Oxytocin is a nine-amino-acid hormone made in the hypothalamus. It is approved for inducing labour and studied intranasally for social and sexual function.',
    mechanism: 'It acts on oxytocin receptors in the brain to increase trust, empathy and pair bonding, and on the uterus and breast in childbirth.',
    evidence: 'Robust obstetric use; intranasal trials for autism, anxiety and sexual function show small and inconsistent effects.',
  },

  // ---- Sleep --------------------------------------------------------------------------------
  {
    id: 'dsip',
    name: 'DSIP',
    nickname: 'The Sleep Signal',
    category: 'sleep',
    blurb: 'Delta sleep-inducing peptide that promotes deep, slow-wave sleep.',
    tags: ['Sleep', 'Stress', 'Recovery'],
    status: 'research',
    route: 'Subcutaneous',
    overview: 'DSIP was isolated from rabbit brains in the 1970s after researchers found it induced delta-wave sleep.',
    mechanism: 'Thought to modulate GABA and reduce cortisol release, nudging the brain toward slow-wave sleep.',
    evidence: 'Small older human studies show modest improvements in sleep and pain; results are inconsistent. Research compound.',
  },
];

export type Stack = {
  id: string;
  name: string;
  blurb: string;
  category: CategoryId;
  peptides: string[];
  rationale: string;
};

/** Well-known combinations, described rather than prescribed. */
export const STACKS: Stack[] = [
  {
    id: 'wolverine',
    name: 'Wolverine',
    blurb: 'Healing and recovery, the classic combination.',
    category: 'healing',
    peptides: ['bpc-157', 'tb-500'],
    rationale: 'BPC-157 works locally on tendon, ligament and gut tissue while TB-500 acts systemically on cell migration and inflammation, so the two are usually run together after injury.',
  },
  {
    id: 'glow',
    name: 'GLOW',
    blurb: 'Skin, recovery and connective tissue.',
    category: 'healing',
    peptides: ['ghk-cu', 'bpc-157', 'tb-500'],
    rationale: 'Adds GHK-Cu\u2019s collagen and skin-remodelling signals on top of the Wolverine pair; popular for skin quality and post-procedure recovery.',
  },
  {
    id: 'klow',
    name: 'KLOW',
    blurb: 'GLOW plus gut and inflammation support.',
    category: 'healing',
    peptides: ['kpv', 'ghk-cu', 'bpc-157', 'tb-500'],
    rationale: 'KPV brings targeted anti-inflammatory action in the gut lining to the GLOW combination, for people whose recovery goals include digestion.',
  },
  {
    id: 'gh-classic',
    name: 'GH Classic',
    blurb: 'A natural growth-hormone pulse, amplified.',
    category: 'growth',
    peptides: ['cjc-1295', 'ipamorelin'],
    rationale: 'CJC-1295 raises the size of each GH pulse and ipamorelin triggers the pulse itself; together they produce a larger release than either alone while staying within the body\u2019s own rhythm.',
  },
  {
    id: 'metabolic',
    name: 'Metabolic Reset',
    blurb: 'Appetite control with mitochondrial support.',
    category: 'weight',
    peptides: ['semaglutide', 'mots-c'],
    rationale: 'A GLP-1 agonist handles intake and glucose; MOTS-c is added by some for its exercise-like effects on muscle metabolism. The second half of that pairing is far less proven.',
  },
  {
    id: 'clarity',
    name: 'Clarity',
    blurb: 'Focus by day, calm by evening.',
    category: 'cognitive',
    peptides: ['semax', 'selank'],
    rationale: 'The Russian pair: Semax for attention and neuroprotection, Selank for anxiety without sedation. Both are nasal, which keeps this stack needle-free.',
  },
];

export const peptideById = (id: string) => PEPTIDES.find((p) => p.id === id);
export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;

export function searchPeptides(query: string, category: CategoryId | 'all'): Peptide[] {
  const q = query.trim().toLowerCase();
  return PEPTIDES.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (!q) return true;
    return [p.name, p.nickname, p.blurb, p.aka ?? '', ...p.tags].some((s) => s.toLowerCase().includes(q));
  });
}

export const STATUS_LABEL: Record<Status, string> = {
  approved: 'Approved medicine',
  research: 'Research compound',
  supplement: 'Supplement',
};

// ---- saved -------------------------------------------------------------------------------

const SAVED_KEY = 'pepmaxing.library.saved.v1';
let saved: string[] = [];
let savedLoaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const savedStore = {
  get: () => saved,
  toggle(id: string) {
    saved = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id];
    emit();
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify(saved)).catch(() => {});
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (!savedLoaded) {
      savedLoaded = true;
      AsyncStorage.getItem(SAVED_KEY)
        .then((raw) => {
          if (raw) {
            saved = JSON.parse(raw) as string[];
            emit();
          }
        })
        .catch(() => {});
    }
    return () => listeners.delete(listener);
  },
};

export function useSaved(): string[] {
  return useSyncExternalStore(savedStore.subscribe, savedStore.get, savedStore.get);
}
