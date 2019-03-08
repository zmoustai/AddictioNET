# AddictioNET
* **JABRI Mhamed, MOUSTAINE Zakariae et SAHRAOUI Ahmed** * - 03/2019
***

Nous passons énormement de temps sur internet chaque jour, que cela soit pour des besoins scolaires/pro ou pour se divertir. Nous souhaitons analyser notre utilisation et visualiser le temps passé sur chaque catégorie de sites web ou de façon plus granulaire, sur chaque site web. Ces visualisations permettront notamment de quantifier notre productivité au cours des semaines à venir et éventuellement nous aider à être plus productifs en gérant  correctement notre utilisation. 

<p align="center">
  <img src="demo.gif" width="800">
</p>

## Visualisations
L'application que nous avons développé permet d'avoir un aperçu qualitatif et quantitatif sur le temps passé sur sa machine. Ceci se fait à travers cinq graphiques différents : 
* Le premier, en haut à gauche, permet de représenter l'évolution temporelle (quotidienne) des trois grandes catégories d'activités, à savoir lees activités productives, distractives et neutres.             
* Concernant le deuxième qui est en bas à gauche, il permet de tracer la moyenne du score de productivité par heure. Pour comprendre comment ce score est calculé, donnons-un exemple simple : Si entre 18h et 19h vous passez 40 minutes sur une activité productive, 10 minutes sur une activité distractive et 10 sur une activité neutre, alors votre score pour cette heure est $1*0.66 +0.5*0.16+0*0.16$  pour toutes les heures de la journée.
* Le troisième, en haut à droite, est un camembert (pie chart) montrant la répartion moyenne des trois catégories précédentes sur l'ensemble des données chargées, tout en quantifiant cela en terme d'heures devant l'écran.
* Le quatrième est un graphique à barres horizontales qui montre un classement des applications les plus utilisées avec la durée totale passée pour chacune d'elles.
* Sur le dernier, qui est un graphique à barres horizontales, on peut voir les sous-catégories dans lesquelles on passe le plus de temps, avec la durée totale passée pour chacune d'elles.

## Fonctionnalités

### Filtres
L'application contient deux types de filtres différents. D'abord, la barre tout en haut à droite peut de choisir les jours sur lesquels on veut faire la visualisation, ce qui peut être utile dans le cas où on veut avoir une idée sur la productivité durant des jours spéciaux, comme les weekends par exemples. On peut également, sur la légende du camembert, cliquer sur une des trois catégories (**Distracted**, **Neutral** et **Productive**) pour ne visualiser que les données correspondant à cette catégorie. Ceci permet d'avoir une vue approfondie et détaillée de chacune des trois catégories. 

### Zoom
En dessous des deux visualisations temporelles (*Productivity Evolution* et *Hourly Productivity Score*), on peut trouver des sliders qui permettent de séléctionner les dates où les heures pour lesquelles on veut visualier. Comme on peut le voir sur la démonstration ci-dessus, en modifiant le slider d'un graphe, les autres graphes se mettent à jour pour s'adapter aux nouvelles dates/heures.

## Ressources utilisées
- [Interactive Data Visualization course (ECL MOS 5.5) - Romain Vuillemot](https://github.com/LyonDataViz/MOS5.5-Dataviz)
- [Horizontal Bar Chart with specific informations](https://bl.ocks.org/alandunning/7008d0332cc28a826b37b3cf6e7bd998?fbclid=IwAR3rObL7VjqSWmA8a51X4M6Jl0S_F8u5RiicRGZsaT6w9JrC9ava9lBrKgo)
- [Line Charts with zoom](http://bl.ocks.org/natemiller/7dec148bb6aab897e561?fbclid=IwAR07dlGfEBKmKcQl-No6vZOvh1iGqcdorWoKE-ZHbuj1H_-4AIJKuRUqn2g)
