import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class Sidebar {
  menuItems = [
    {
      label: 'Início',
      icon: '🏠',
      route: '/home'
    },
    {
      label: 'Painel de Inspeção',
      icon: '📋',
      route: '/painel-inspecao'
    },
    {
      label: 'Histórico de Envios',
      icon: '📊',
      route: '/historico-envios'
    },
    {
      label: 'Configurações',
      icon: '⚙️',
      route: '/config'
    }
  ];
}